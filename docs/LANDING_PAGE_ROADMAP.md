# Omaad Wealth — Landing Page Roadmap

This document tracks all landing page enhancement items, their current status, impact assessment, and implementation details for items that are built but not yet active.

---

## Current Landing Page Flow

```
Hero
 └─ How It Works (3-step strip)
     └─ FIRE Projection (Monte Carlo 10/20/30 years)
         └─ Features (4 feature cards)
             └─ Pain Calculator (cost of waiting)
                 └─ Wealth Score (5-axis radar)
                     └─ Highlights (FIRE tracker, asset allocation, security)
                         └─ Pricing (Gratuit / Pro / Premium)
                             └─ Advisory Teaser
                                 └─ Footer
```

---

## All Items — Status & Impact

| # | Item | Status | Effort | Impact | File |
|---|------|--------|--------|--------|------|
| 1 | Monte Carlo FIRE projection | **Live** | Medium | Very high | `fireprojectionwidget.ts` |
| 2 | Pain Calculator (cost of waiting) | **Live** | Medium | High | `paincalculatorwidget.ts` |
| 3 | "Comment ça marche" 3-step strip | **Live** | Small | Medium-high | `howitworkswidget.ts` |
| 4 | Social proof counters | **Built, removed** | Small | Medium | `socialproofwidget.ts` |
| 5 | "Qui sommes-nous" page | **Live** (standalone) | Medium | Medium (trust) | `qui-sommes-nous.ts` |
| 6 | AI recommendation preview cards | **Built, removed** | Medium | High | `aiinsightswidget.ts` |
| 7 | Omaad Wealth Score radar (5-axis) | **Live** | Large | High (signature) | `wealthscorewidget.ts` |

---

## Live Items — Impact Summary

### 1. Monte Carlo FIRE Projection (`fireprojectionwidget.ts`)
- **What it does:** Interactive 3-column widget showing wealth projections at 10, 20, and 30 years across pessimistic (4%), median (7%), and optimistic (10%) scenarios.
- **Why it matters:** Gives visitors an immediate, personalized "aha" moment. The slider interaction creates engagement and the large numbers create urgency to start investing.
- **Dependencies:** I18nService, Router.

### 2. Pain Calculator (`paincalculatorwidget.ts`)
- **What it does:** Compares "money sleeping at 2%" vs "money invested at 8%" over N years. Displays the gap in wealth and a multiplier.
- **Why it matters:** Loss aversion is the strongest behavioral finance lever. Showing the concrete FCFA cost of inaction converts hesitant visitors.
- **Dependencies:** I18nService, Router.

### 3. "Comment ça marche" 3-Step Strip (`howitworkswidget.ts`)
- **What it does:** Three-column layout with numbered steps: Connect → Track → Achieve. Desktop connector line between circles.
- **Why it matters:** Reduces perceived complexity immediately after the hero. Answers "is this hard?" before the visitor even asks.
- **Dependencies:** I18nService.

### 5. "Qui sommes-nous" Page (`qui-sommes-nous.ts`)
- **What it does:** Standalone page with mission hero, 4 KPI counters, origin story, 6 value cards, founder card, ghost recruiting card, contact section, and dual CTAs.
- **Why it matters:** Trust page for users who want to know who's behind the product. Critical for African diaspora audience where trust in fintech is lower.
- **Routes:** `/:lang/qui-sommes-nous` and `/:lang/about`.
- **Dependencies:** I18nService, Router, TopbarWidget, FooterWidget.

### 7. Omaad Wealth Score Radar (`wealthscorewidget.ts`)
- **What it does:** 5-axis radar chart (Epargne, Investissement, Protection, Planification, Diversification) with a "Sans Omaad / Avec Omaad" toggle. Shows score 42→78, animated transitions, and per-axis breakdown with color-coded insights.
- **Why it matters:** Creates a signature visual identity for Omaad. The before/after toggle is a powerful conversion mechanic — visitors see the gap and want to close it.
- **Dependencies:** I18nService, Router, LayoutService, ChartModule (Chart.js), PrimeNG.

---

## Removed Items — Full Implementation Details

These items are **fully built and functional**. Their component files, i18n keys, and styles are all in place. To re-enable, simply import and add the selector to `landing.ts`.

---

### 4. Social Proof Counters (`socialproofwidget.ts`)

**Status:** Built, removed from landing page. File retained at `components/socialproofwidget.ts`.

**What it does:**
- 4-column counter strip with pre-launch metrics
- `IntersectionObserver`-based reveal animation (values show "—" until scrolled into view)
- Hover scale effect on numbers
- Subtle grid background pattern

**Current sample data (pre-launch):**

| Counter | Value | Label |
|---------|-------|-------|
| 1 | 15 | newsletter editions already written |
| 2 | 3 | currencies supported (EUR, XOF, USD) |
| 3 | 2 | continents covered |
| 4 | 1er juin | public launch (highlighted) |

**Impact:** Medium. Social proof is a proven conversion lever, but pre-launch numbers are modest. This section becomes significantly more impactful post-launch once real user/AUM metrics are available.

**When to re-enable:**
- After public launch when you have real user counts
- When you can show metrics like "X utilisateurs", "X FCFA patrimoine suivi", "X transactions analysées"
- Consider A/B testing with vs without to measure conversion lift

**How to re-enable:**

1. In `landing.ts`, add the import:
```typescript
import { SocialProofWidget } from './components/socialproofwidget';
```

2. Add `SocialProofWidget` to the `imports` array.

3. Add the selector in the template where desired (recommended: after `<how-it-works-widget />`):
```html
<social-proof-widget />
```

4. Update the i18n keys in `fr.ts` and `en.ts` under `landing.socialProof` with real numbers.

**i18n keys location:** `landing.socialProof.*` in both `fr.ts` and `en.ts`.

---

### 6. AI Recommendation Preview Cards (`aiinsightswidget.ts`)

**Status:** Built, removed from landing page. File retained at `components/aiinsightswidget.ts`.

**What it does:**
- 3-column card layout, each simulating a real Omaad AI recommendation
- Each card contains:
  - A color-coded category tag (ochre / warning-yellow / positive-green)
  - A bold insight headline (e.g. "Your safety net covers 2.3 months")
  - A recommendation box with arrow icon and actionable advice
  - A status pill with colored dot (e.g. "En cours", "À surveiller", "En bonne voie")
  - A subtle AI sparkle icon in the top-right corner (opacity increases on hover)
- Italic disclaimer note below: "Preview with sample data — sign in to see your own."

**The 3 sample insight cards:**

| # | Category | Insight | Recommendation | Status |
|---|----------|---------|----------------|--------|
| 1 | Épargne de précaution (ochre) | Safety net covers 2.3 months | Add 50k FCFA/month → 6 months in 8 months | En cours |
| 2 | Concentration (warning) | 78% of wealth in real estate | Diversify into ETFs or BRVM | À surveiller |
| 3 | Objectif FIRE (positive) | FIRE in 14 years at current pace | 100k→150k/month cuts to 11 years | En bonne voie |

**Impact:** High. This section previews the core value proposition — that Omaad doesn't just show data, it tells you what to do. It sells the "AI advisor" angle effectively. However, it works best when the actual recommendation engine exists in the product so the landing page promise matches the reality.

**When to re-enable:**
- When the recommendation/insight engine is live in the dashboard (even a v1)
- When you want to emphasize the "smart advisor" positioning over the "tracking tool" positioning
- Consider placing it between Pain Calculator and Wealth Score for maximum narrative flow

**How to re-enable:**

1. In `landing.ts`, add the import:
```typescript
import { AiInsightsWidget } from './components/aiinsightswidget';
```

2. Add `AiInsightsWidget` to the `imports` array.

3. Add the selector in the template (recommended placement):
```html
<pain-calculator-widget />
<ai-insights-widget />
<wealth-score-widget />
```

4. Optionally update the sample insights in `fr.ts` / `en.ts` under `landing.aiInsights.*` to match real product capabilities.

**i18n keys location:** `landing.aiInsights.*` in both `fr.ts` and `en.ts`.

**Design considerations for re-enabling:**
- If the AI engine produces real recommendations, consider making the cards dynamic (fetching anonymized/aggregated sample insights from the API)
- The current static copy is carefully written to be realistic — update it if the product's recommendation scope changes
- The 3-card layout works well on desktop; on mobile they stack vertically which is fine

---

## Recommended Future Additions

Beyond the 7 items above, potential next landing page enhancements:

- **Testimonials / Press logos** — once you have beta user quotes or press coverage
- **Live demo video** — a 60-second walkthrough of the dashboard
- **Comparison table** — Omaad vs spreadsheets vs Finary vs others
- **Newsletter signup inline** — embed FIRE Africa signup directly on landing page
- **Localized content blocks** — different hero copy for Dakar vs Paris vs Abidjan audiences
