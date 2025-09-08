# Finova - FIRE Tracking App (Angular 19)

<p align="center">
  <img src="src/assets/finova-logo.svg" alt="Finova" width="120" height="120" />
</p>

Finova is a personal finance web app built on Angular 19 that transforms the Sakai template into a FIRE-oriented tracker. The goal is to track wealth over time and monitor expenses and income month by month, offering clear insights to help reach Financial Independence, Retire Early (FIRE).

## Key Features (planned and in-progress)

- **Dashboard overview**: Net worth, savings rate, recent transactions, and category breakdowns.
- **Savings module**: Progress charts, transactions list, and savings KPIs.
- **Debts module**: Debt overview, payoff progression, and interest tracking.
- **Transactions**: Unified view for income and expenses with categorization.
- **Patrimoine (Wealth)**: Assets and liabilities registry to compute net worth.
- **Theming**: Light/dark mode via PrimeNG themes and Tailwind utilities.

These align with current code modules such as `dashboard`, `savings`, `debts`, `transaction`, and `patrimoine` under `src/app/pages/`.

## Tech Stack

- **Framework**: Angular 19 (Vite dev server via Angular CLI)
- **UI**: PrimeNG 19, @primeng/themes, PrimeIcons
- **Charts**: PrimeNG Chart (Chart.js)
- **Styling**: SCSS + Tailwind utilities (`tailwind.css`)
- **Tooling**: ESLint, Prettier, Jasmine/Karma

## Getting Started

- **Install dependencies**:
  ```bash
  npm install
  ```
- **Start dev server**:
  ```bash
  ng serve --port 4200
  ```
  Then open `http://localhost:4200/`.
- **Build for production**:
  ```bash
  ng build
  ```
- **Run unit tests**:
  ```bash
  ng test
  ```

## Current App Structure (high-level)

- `src/app/pages/dashboard/`: Widgets for savings, worth distribution/progression, recent transactions
- `src/app/pages/savings/`: `savingsdashboard`, components for progress and transactions
- `src/app/pages/debts/`: `debtsdashboard`, stats and progress components
- `src/app/pages/patrimoine/`: Base for assets/liabilities management
- `src/app/pages/transaction/`: Transactions page
- `src/app/layout/`: Topbar, sidebar, menu, and layout services

## Roadmap Suggestions

- **Data model and storage**
  - Define domain models (Account, Asset, Liability, Transaction, Category, Goal)
  - Add a persistence layer (start with local storage/IndexedDB; later API)
- **Transactions**
  - CRUD with categories and notes; CSV import
  - Monthly budgeting and category insights
- **Wealth tracking**
  - Asset/liability CRUD, valuation snapshots, net worth time series
  - FIRE progress bar (target number, SWR assumption)
- **Charts & analytics**
  - Monthly income/expense trends, savings rate, category sunburst
- **Security & settings**
  - Auth (local-first optional), currency, locale, theme
- **Polish**
  - Responsive dashboards, empty states, accessibility

## Contributing

Issues and PRs are welcome. Please use ESLint/Prettier and follow Angular style guidelines.

## License

This project is based on the Sakai template; check `LICENSE.md` for terms.
