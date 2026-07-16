# Omaad Wealth Score — Integration Documentation

> A 5-axis financial health score computed from the user's existing data (assets, transactions, goals, debts, FIRE settings). Displays as a compact radar card on the dashboard and a dedicated full page with breakdown.

---

## Overview

The Wealth Score gives users a single number (0-100) that summarizes the strength of their financial situation. It is broken down into 5 axes, each scored independently, then combined via a weighted average.

| Axis | Weight | What it measures |
|------|--------|-----------------|
| Epargne (Savings) | 25% | Savings rate, emergency fund coverage, active goals |
| Investissement (Investing) | 20% | Investment rate, presence of investment assets, portfolio diversity |
| Protection | 15% | Debt ratio, emergency goal existence, expense stability |
| Planification (Planning) | 25% | FIRE target defined, goals count, FIRE progress |
| Diversification | 15% | Asset class count, HHI concentration, multi-currency |

---

## Data Sources Per Axis

```
Epargne
├── monthly_income & monthly_expenses (from Transaction model, last 6 months)
├── liquid assets total (Asset categories: cash, savings_account, mobile_money)
└── SavingGoal (active goals, progress percentage)

Investissement
├── monthly investment (Transaction category: investment, last 6 months)
├── Assets with investment categories (stocks, bonds, crypto, tontine, life_insurance, retirement, commodities)
└── distinct investment category count

Protection
├── total debts (Debt model, type: I_OWE, active, not paid off)
├── total assets value (Asset model)
├── monthly expense history (for coefficient of variation)
└── emergency goal detection (SavingGoal with template_key "emergency" or name containing "urgence"/"emergency")

Planification
├── User.fire_target_amount
├── net_worth = total_assets - total_debts
└── SavingGoal (active count)

Diversification
├── distinct Asset.category values
├── HHI = sum of (category_value / total_value)^2
└── distinct Asset.currency values
```

---

## Scoring Model

### Axis 1: Epargne (0-100, weight 25%)

| Sub-score | Points | Formula |
|-----------|--------|---------|
| Savings rate | 0-40 | Linear interpolation: 0% → 0, 20%+ → 40 |
| Emergency fund months | 0-40 | liquid_assets / monthly_expenses. 0 months → 0, 6+ months → 40 |
| Active goals | 0-20 | No active goals = 0, has goals = 10, avg progress > 50% = 20 |

### Axis 2: Investissement (0-100, weight 20%)

| Sub-score | Points | Formula |
|-----------|--------|---------|
| Investment rate | 0-50 | monthly_investment / monthly_income. 0% → 0, 15%+ → 50 |
| Has investments | 0-30 | Owns any investment asset = 30, none = 0 |
| Portfolio diversity | 0-20 | 2+ investment sub-categories = 20, 1 = 10, 0 = 0 |

### Axis 3: Protection (0-100, weight 15%)

| Sub-score | Points | Formula |
|-----------|--------|---------|
| Debt ratio | 0-40 | total_debts / total_assets. 0% = 40, <30% = 30, <60% = 15, >60% = 0 |
| Emergency goal | 0-30 | Has emergency saving goal = 30 |
| Expense stability | 0-30 | Coefficient of variation of monthly expenses. CV < 0.15 = 30, < 0.30 = 20, < 0.50 = 10, else 0 |

### Axis 4: Planification (0-100, weight 25%)

| Sub-score | Points | Formula |
|-----------|--------|---------|
| FIRE target set | 0-30 | fire_target_amount > 0 = 30 |
| Goals defined | 0-30 | 0 goals = 0, 1 = 15, 2+ = 30 |
| FIRE progress | 0-40 | net_worth / fire_target. 0% → 0, 75%+ → 40 |

### Axis 5: Diversification (0-100, weight 15%)

| Sub-score | Points | Formula |
|-----------|--------|---------|
| Asset class count | 0-40 | 1 = 5, 2 = 15, 3 = 25, 4+ = 40 |
| Concentration HHI | 0-40 | HHI < 0.25 = 40, < 0.50 = 25, < 0.75 = 10, >= 0.75 = 0 |
| Multi-currency | 0-20 | 2+ currencies = 20 |

**Total score** = sum of (axis_score × axis_weight) for all 5 axes.

---

## Architecture

```
┌─────────────────┐       GET /api/v1/wealth-score        ┌──────────────────────┐
│                 │ ──────────────────────────────────────▶│                      │
│  Angular App    │                                        │  FastAPI Backend      │
│                 │◀──────────────────────────────────────│                      │
└─────────────────┘       WealthScoreResponse JSON         └──────────┬───────────┘
                                                                      │
                                                                      ▼
                                                           ┌──────────────────────┐
                                                           │  PostgreSQL DB        │
                                                           │  (assets, txns,       │
                                                           │   goals, debts, user) │
                                                           └──────────────────────┘
```

**Request flow:**
1. Frontend calls `GET /api/v1/wealth-score` (authenticated)
2. Backend fetches user's assets, transactions (last 6 months), saving goals, debts
3. Backend computes aggregates (monthly income/expenses, totals, liquid assets)
4. Backend runs each axis scoring function
5. Backend returns `WealthScoreResponse` with total + 5 axes + sub-scores + insight keys
6. Frontend renders radar chart + axis breakdown

---

## File Structure

### Backend

| File | Purpose |
|------|---------|
| `backend/app/api/v1/endpoints/wealth_score.py` | Endpoint + all scoring logic |
| `backend/app/api/v1/router.py` | Registers the wealth_score router |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/app/core/services/api.service.ts` | `getWealthScore()` method + TS interfaces |
| `frontend/src/app/pages/service/wealth-score.service.ts` | Signal-based service with caching |
| `frontend/src/app/pages/dashboard/components/wealthscorewidget.ts` | Compact radar widget on dashboard |
| `frontend/src/app/pages/wealth-score/wealth-score.ts` | Full dedicated page |
| `frontend/src/app/pages/pages.routes.ts` | Route: `/:lang/pages/wealth-score` |
| `frontend/src/app/pages/landing/components/wealthscorewidget.ts` | Landing page preview (static demo data) |
| `frontend/src/app/i18n/fr.ts` | French i18n keys under `wealthScore.insight.*` and `wealthScore.subLabel.*` |
| `frontend/src/app/i18n/en.ts` | English i18n keys |

---

## API Response Schema

```json
{
  "total_score": 58,
  "axes": [
    {
      "axis": "epargne",
      "score": 65,
      "max_score": 100,
      "sub_scores": [
        { "label": "savings_rate", "score": 25, "max_score": 40, "raw_value": 12.5 },
        { "label": "emergency_fund_months", "score": 30, "max_score": 40, "raw_value": 4.2 },
        { "label": "active_goals", "score": 10, "max_score": 20, "raw_value": 2 }
      ],
      "insight_key": "wealthScore.insight.epargneGood"
    },
    {
      "axis": "investissement",
      "score": 45,
      "max_score": 100,
      "sub_scores": [
        { "label": "investment_rate", "score": 15, "max_score": 50, "raw_value": 4.8 },
        { "label": "has_investments", "score": 30, "max_score": 30, "raw_value": 3 },
        { "label": "portfolio_diversity", "score": 0, "max_score": 20, "raw_value": 1 }
      ],
      "insight_key": "wealthScore.insight.investRateLow"
    }
  ],
  "computed_at": "2026-05-10T22:00:00.000Z"
}
```

---

## Frontend Service (WealthScoreService)

The service is a singleton (`providedIn: 'root'`) that:
- Exposes reactive signals: `loading`, `error`, `data`, `totalScore`, `axes`, `hasData`
- Provides `load()` (no-op if already loading) and `refresh()` (clears cache + reloads)
- Uses `firstValueFrom` to convert the Observable to a Promise for signal-friendly async

```typescript
// Usage in any component:
scoreService = inject(WealthScoreService);

async ngOnInit() {
    await this.scoreService.load();
}
// Then use scoreService.totalScore(), scoreService.axes(), etc. in templates
```

---

## Insight Keys

The backend returns an `insight_key` per axis (e.g. `"wealthScore.insight.epargneLow"`). The frontend resolves these via the i18n service to display a human-readable recommendation.

Available insight keys:
- `epargneLow` / `epargneRateLow` / `epargneGood`
- `investNone` / `investRateLow` / `investGood`
- `protectionDebtHigh` / `protectionNoEmergency` / `protectionGood`
- `planNone` / `planNoFire` / `planNoGoals` / `planGood`
- `divNoAssets` / `divConcentrated` / `divFewClasses` / `divGood`

---

## Color Coding

Scores are color-coded throughout the UI:
- **Green** (>= 70): `text-positive-600`, `bg-positive-500`
- **Ochre/Amber** (40-69): `text-ochre-600`, `bg-ochre-500`
- **Red** (< 40): `text-negative`, `bg-red-500`

---

## What is NOT built yet (future iterations)

| Feature | Description | Prerequisite |
|---------|-------------|--------------|
| Score history | Monthly snapshots stored in a new DB table for trend chart | New `WealthScoreSnapshot` model |
| Insurance model | Proper `Insurance` entity to improve Protection axis | New model + CRUD endpoints |
| AI recommendations | Personalized advice generated from low-scoring axes | AI/ML integration |
| Gamification | Badges, streaks, score milestones | Score history + notification system |
| Sidebar navigation entry | Add "Wealth Score" to the app sidebar menu | UI update to layout component |

---

## How to Test Locally

1. Start the backend: `cd backend && uvicorn app.main:app --reload --port 8000`
2. Ensure `frontend/src/environments/environment.ts` has `apiUrl: 'http://localhost:8000/api/v1'`
3. Start the frontend: `cd frontend && ng serve`
4. Log in and navigate to the dashboard — the Wealth Score card should appear
5. Click "Deteil par axe" to navigate to the full page at `/:lang/pages/wealth-score`
6. If no data exists, the empty state with guidance is shown
