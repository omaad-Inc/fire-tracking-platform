# Currency Architecture — Omaad Wealth

## Overview

Omaad Wealth is designed to serve users across different currency zones — Senegal (FCFA / XOF),
France (EUR), and beyond.  
The golden rule is simple:

> **The backend always stores amounts in EUR.  
> The frontend always displays and accepts amounts in the user's preferred currency.**

The conversion is invisible to the user. A Senegalese user entering `25 000 000`
always means 25 million FCFA, regardless of whether that maps to ~38 109 EUR internally.

---

## How it works end-to-end

```
┌──────────────────────────────────────────────────────────────────────┐
│  User (FCFA preference)                                              │
│                                                                      │
│  Types: 25 000 000                                                   │
│         ↓  ÷ 655.957  (toBaseAmount)                                 │
│  Service sends: 38 109.12 EUR  ──→  Backend stores: 38 109.12 EUR   │
│                                                                      │
│  Backend returns: 38 109.12 EUR                                      │
│         ↓  × 655.957  (convert / AppAmountComponent)                │
│  User sees: 25 000 000 FCFA                                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  User (EUR preference)                                               │
│                                                                      │
│  Types: 38 109                                                       │
│         ↓  ÷ 1  (toBaseAmount — rate is 1 for EUR)                  │
│  Service sends: 38 109 EUR  ──→  Backend stores: 38 109 EUR         │
│                                                                      │
│  Backend returns: 38 109 EUR                                         │
│         ↓  × 1  (convert)                                           │
│  User sees: 38 109 €                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Both users store the same value.  Both users see a meaningful number in their own currency.

---

## Key files

| File | Role |
|---|---|
| `src/app/core/services/currency.service.ts` | Single source of truth for rate, symbol, locale, and all conversion helpers |
| `src/app/core/components/app-amount.component.ts` | Reusable display component — reads EUR from API, shows in display currency |
| `src/app/pages/service/debts.service.ts` | Calls `toBaseAmount()` before every `createDebt` / `updateDebt` / `addPayment` |
| `src/app/pages/service/transactions.service.ts` | Calls `toBaseAmount()` before every `createTransaction` / `updateTransaction` |
| `src/app/pages/service/savings.service.ts` | Calls `toBaseAmount()` before every `addTransaction` / `updateTransaction` / `addContribution` |
| `src/app/layout/component/app.topbar.ts` | Calls `toBaseAmount()` (`toEur()` alias) before every `createAsset` |
| `src/app/pages/settings/components/fire-settings.ts` | Converts on load (EUR → display) and on save (display → EUR) |

---

## CurrencyService API

```typescript
// Current rate, symbol, locale — reactive Angular signal
cs.config()           // → { code: 'XOF', symbol: 'FCFA', rate: 655.957, locale: 'fr-FR' }

// Display direction: EUR stored value → what the user sees
cs.convert(eurValue)  // 38109 → 25 000 000  (FCFA)
cs.format(eurValue)   // '25 000 000 FCFA'
cs.formatNumber(v)    // '25 000 000'  (no symbol — used inside AppAmountComponent)

// Input direction: what the user typed → EUR to store
cs.toBaseAmount(displayValue)   // 25 000 000 → 38 109.12
```

### Supported currencies

| Code | Symbol | Rate (EUR) | Locale |
|------|--------|-----------|--------|
| XOF  | FCFA   | 655.957   | fr-FR  |
| EUR  | €      | 1         | fr-FR  |
| USD  | $      | 1.08      | en-US  |

The user selects their preferred currency in **Settings → Preferences**.

---

## Rules for contributors

### ✅ DO

- Call `cs.toBaseAmount(amount)` in **every service method** that sends a monetary
  value to the API (`createX`, `updateX`, `addPayment`, `addContribution`).
- Use `<app-amount [value]="eurValue" />` for all monetary displays — it handles
  the `convert()` call internally.
- Use `mode="decimal"` (not `mode="currency" currency="EUR"`) for `p-inputnumber`
  components, and show `{{ cs.config().symbol }}` in the label.
- When loading saved values from the API for display in an editable input, apply
  `cs.convert(eurValue)` to populate the field in display currency.

### ❌ DON'T

- Never send a raw user-entered amount to the API without calling `toBaseAmount()` first.
- Never hardcode `currency="EUR"` or the `€` symbol in form labels.
- Never call `HttpClient` directly from components — always go through a service
  (where the conversion lives).

---

## Adding a new monetary form field

1. In the template: use `mode="decimal"` on `p-inputnumber` and show `cs.config().symbol` in the label.
2. When loading from API: populate the field with `cs.convert(backendValue)`.
3. In the service: apply `cs.toBaseAmount(fieldValue)` before passing to the API.

```typescript
// Template
<label>Montant ({{ cs.config().symbol }})</label>
<p-inputnumber [(ngModel)]="myAmount" mode="decimal" [minFractionDigits]="0" />

// Service
async save(amount: number) {
    await this.api.createFoo({ amount: this.cs.toBaseAmount(amount) });
}

// Load
this.myAmount = Math.round(this.cs.convert(apiResponse.amount));
```

---

## Exchange rate

The rate is currently **static** (defined in `CurrencyService.CURRENCIES`).

Future improvement: fetch live rates from an FX API (e.g. exchangerate.host) and
cache them in localStorage with a 1-hour TTL.  The `toBaseAmount` / `convert` methods
do not need to change — only the rate source changes.

---

## Testing checklist

When adding or modifying a monetary flow, verify:

- [ ] A FCFA user can create the record — the stored EUR value looks reasonable
      (÷ 655.957 of what was entered)
- [ ] Reloading the page shows the original display-currency value (EUR → FCFA)
- [ ] Switching currency in Settings updates all displayed amounts immediately
- [ ] A EUR user's workflow is unaffected (rate = 1, no numerical change)
