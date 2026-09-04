import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, from, firstValueFrom } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ShareContextService, PublicPortfolioBundle } from './share-context.service';
import { User, NOTIF_PREFS_CACHE_KEY } from './token.service';
import { FeedbackRating, FeedbackReason } from '../ai/chat-events';

// ============================================
// ASSET INTERFACES
// ============================================
export type AssetCategory =
    | 'real_estate'
    | 'stocks_brvm'
    | 'stocks_intl'
    | 'fcp'
    | 'bonds'
    | 'crypto'
    | 'cash'
    | 'retirement'
    | 'life_insurance'
    | 'savings_account'
    | 'business'
    | 'vehicle'
    | 'collectibles'
    | 'commodities'
    | 'tontine'
    | 'mobile_money'
    | 'other';

export interface Asset {
    id: number;
    name: string;
    category: AssetCategory;
    current_value: number;
    purchase_value: number | null;
    purchase_date: string | null;
    quantity: number | null;
    ticker: string | null;
    currency: string;
    notes: string | null;
    is_liquid: boolean;
    institution: string | null;
    location: string | null;
    description: string | null;
    annual_return: number | null;
    rental_income: number | null;
    gain_loss: number | null;
    gain_loss_percent: number | null;
    // Date of the BRVM close behind current_value (tickered BRVM stocks only)
    quote_as_of: string | null;
    // Real estate specific
    surface_m2: number | null;
    price_per_m2_purchase: number | null;
    construction_date: string | null;
    agency_fees: number | null;
    notary_fees: number | null;
    renovation_fees: number | null;
    furnishing_costs: number | null;
    // Tontine specific
    tontine_monthly_contribution: number | null;
    tontine_participants: number | null;
    tontine_start_date: string | null;
    tontine_collection_date: string | null;
    tontine_status: string | null;
    tontine_frequency: string | null;
    // Mobile Money specific
    mobile_money_operator: string | null;
    created_at: string;
    updated_at: string;
}

/** One BRVM session close for a title, in the asset's NATIVE currency
 *  (like Asset.current_value — the client converts to display currency once). */
/** One point of an asset's real value series. */
export interface AssetHistoryPoint {
    date: string;
    value: number;
}

/** A month's closing value and the move since the month before. */
export interface MonthlyChange {
    month: string;                  // 'YYYY-MM'
    value: number;
    change: number | null;          // null for the first month shown
    change_percent: number | null;
}

/** An asset's REAL value series, for any asset kind. `source` says where it
 *  comes from — 'transactions' (an account's balance, derived from its ledger),
 *  'quotes' (a market title) or 'recorded' (points written down for a
 *  manually-valued asset). Never fabricated: an asset with no history returns
 *  an empty `points`, which must render as no chart rather than a decorative
 *  one. Money is in the asset's native currency. */
export interface AssetHistory {
    asset_id: number;
    currency: string;
    source: 'transactions' | 'quotes' | 'recorded';
    points: AssetHistoryPoint[];
    monthly: MonthlyChange[];
    change: number | null;
    change_percent: number | null;
    complete_from: string | null;   // derived series: earliest trustworthy date
}

/** A category group's combined series. EUR base, not a native currency: a group
 *  can hold XOF and EUR assets at once. */
export interface CategoryHistory {
    categories: string[];
    currency: string;
    points: AssetHistoryPoint[];
    monthly: MonthlyChange[];
    change: number | null;
    change_percent: number | null;
    complete_from: string | null;
}

export interface BrvmHistoryPoint {
    as_of: string;
    close: number;
    value: number;   // close × current quantity (position value at that close)
}

/** Per-title BRVM price history + performance (PRO-3, plans promise P4).
 *  Money fields are in the asset's native currency. */
export interface BrvmHistory {
    ticker: string;
    /** Which catalog the series comes from: BRVM closes or FCP VLs. */
    kind?: 'stock' | 'fcp';
    currency: string;
    quantity: number | null;
    quote_as_of: string | null;
    cost_basis: number | null;
    current_value: number;
    absolute_gain: number | null;
    absolute_gain_percent: number | null;
    annualized_percent: number | null;
    holding_period_days: number | null;
    price_return_percent: number | null;
    first_as_of: string | null;
    last_as_of: string | null;
    points: BrvmHistoryPoint[];
}

/** One session of the whole BRVM sleeve (stocks at close + FCP at VL), XOF. */
export interface BrvmPortfolioPoint {
    as_of: string;
    value: number;
}

/** One title's share of the BRVM sleeve at the latest prices, XOF. `ticker`
 *  is the catalog key (brvm.org ticker or fund slug); `kind` says which. */
export interface BrvmPortfolioAllocation {
    ticker: string;
    name: string;
    value: number;
    weight_percent: number;
    kind: 'stock' | 'fcp';
}

/** Whole-sleeve BRVM analytics (GET /assets/brvm-portfolio, Pro). Every money
 *  field is XOF, the trading currency: convert to EUR base exactly once with
 *  CurrencyService.toEurFromNative(v, 'XOF') before handing it to app-amount.
 *  Only UNREALIZED P&L is reported (single lots, no sell ledger). */
export interface BrvmPortfolio {
    currency: 'XOF' | string;
    holdings_count: number;
    stocks_count: number;
    fcp_count: number;
    total_value: number;
    quote_as_of: string | null;
    costed_count: number;
    cost_basis: number | null;
    unrealized_gain: number | null;
    unrealized_gain_percent: number | null;
    window_return_percent: number | null;
    /** First session where every instrument has a price; the honest start of
     *  the curve (earlier sessions are understated). */
    covered_from: string | null;
    points: BrvmPortfolioPoint[];
    allocation: BrvmPortfolioAllocation[];
    /** Live BRVM/FCP rows the sleeve could not price (free-typed title, or no
     *  unit count); listed so the user can fix the row. */
    untracked: { id: number; name: string; category: string; reason: 'no_key' | 'no_quantity' }[];
}

export interface AssetCreate {
    name: string;
    category: AssetCategory;
    current_value: number;
    purchase_value?: number | null;
    purchase_date?: string | null;
    currency?: string;
    notes?: string | null;
    is_liquid?: boolean;
    institution?: string | null;
    location?: string;
    surface_m2?: number;
    price_per_m2_purchase?: number;
    quantity?: number;
    // Real-estate fields (multi-section wizard)
    description?: string | null;
    rental_income?: number | null;
    construction_date?: string | null;
    agency_fees?: number | null;
    notary_fees?: number | null;
    renovation_fees?: number | null;
    furnishing_costs?: number | null;
    // BRVM stock picker (S9-B1): brvm.org ticker when added from the catalog.
    ticker?: string | null;
    // Tontine specific
    tontine_monthly_contribution?: number | null;
    tontine_participants?: number | null;
    tontine_start_date?: string | null;
    tontine_collection_date?: string | null;
    tontine_status?: string | null;
    tontine_frequency?: string | null;
    // Mobile Money specific
    mobile_money_operator?: string | null;
}

/** A pickable BRVM equity (S9-B1 catalog). Powers "pick SONATEL, enter quantity". */
export interface BrvmInstrument {
    ticker: string;
    name: string;
    sector: string | null;
    country: string | null;
    currency: string;
}

/** A pickable FCP/OPCVM fund (UEMOA). `slug` is the richbourse fund id,
 *  stored on assets.ticker so the FCP engine can revalue the holding;
 *  latest_vl/vl_as_of prefill the per-part value in the add wizard. */
export interface FcpInstrument {
    slug: string;
    name: string;
    sgo: string | null;
    category: string | null;
    currency: string;
    latest_vl: number | null;
    vl_as_of: string | null;
    /** Performance since 1 January / over 12 months, in percent (Marchés). */
    perf_ytd?: number | null;
    perf_1y?: number | null;
}

// ── Marchés (P2-3): free market reference data, XOF native, never converted ──

/** One headline BRVM index: latest level in POINTS, signed day move, and the
 *  last 30 stored closes (oldest first) for a sparkline. */
export interface BrvmIndexEntry {
    code: string;                 // verbatim source code, e.g. 'BRVM-C'
    name: string;
    value: number;
    change_percent: number | null;
    as_of: string;                // ISO date of the level
    spark: number[];
}

export interface BrvmIndicesResponse {
    market_open: boolean;         // clock-only, not holiday-aware (server-side)
    session_date: string;
    indices: BrvmIndexEntry[];
}

export interface BrvmIndexHistoryPoint { as_of: string; value: number; change_percent?: number | null; }
export interface BrvmIndexHistoryResponse { code: string; name: string; points: BrvmIndexHistoryPoint[]; }

/** Latest close per listed equity, XOF, alphabetical by name. `change_percent`
 *  is null when the source omitted the previous close: render a dash, never 0. */
export interface BrvmBoardQuote {
    ticker: string;
    name: string;
    sector: string | null;
    country: string | null;
    close_xof: number;
    change_percent: number | null;
    volume: number | null;
    as_of: string;
}

export interface BrvmTickerHistoryPoint { as_of: string; close_xof: number; }
export interface BrvmTickerHistoryResponse { ticker: string; name: string; points: BrvmTickerHistoryPoint[]; }

export interface FcpVlHistoryPoint { as_of: string; vl_xof: number; }
export interface FcpVlHistoryResponse { slug: string; name: string; points: FcpVlHistoryPoint[]; }

// ── Weekly recap (P2-4): the bundle the Monday email renders, Pro-gated ──────
// Every money value is PRE-FORMATTED by the backend in the user's display
// currency (report_service.build_weekly_report), so the page does no money
// math and must mask these strings itself under privacy mode.
export interface WeeklyReportBundle {
    meta: {
        period: string;             // ISO week, e.g. '2026-W36'
        period_label: string;       // localized "Semaine du 26/08 au 01/09/2026"
        range_start: string;
        range_end: string;
        lang: string;
        currency: string;
        user_name: string;
        generated_at: string;
    };
    summary: {
        net_worth: string;
        income: string;
        expenses: string;
        net_savings: string;
        savings_rate: number;       // percent
        fire_progress: number | null;
    };
    top_expenses: Array<{ category: string; amount: string }>;
    goals: Array<{ name: string; current: string; target: string; pct: number }>;
    has_content: boolean;
}

export interface TontineCycleView {
    cycle_number: number;
    due_date: string;
    amount: number;
    paid: boolean;
    paid_date: string | null;
    is_payout: boolean;
    notes: string | null;
}

export interface TontineSchedule {
    asset_id: number;
    name: string;
    currency: string;
    frequency: string;          // 'monthly' | 'weekly'
    participants: number;
    contribution: number;
    pot_size: number;
    cycles: TontineCycleView[];
    contributions_made: number;
    contributions_total: number;
    total_contributed: number;
    is_complete: boolean;
    next_due_cycle: number | null;
    next_due_date: string | null;
    payout_cycle_number: number | null;
    payout_date: string | null;
    payout_collected: boolean;
}

export interface TontineCyclePay {
    paid: boolean;
    paid_date?: string | null;
    notes?: string | null;
}

export interface AssetUpdate {
    name?: string;
    category?: AssetCategory;
    current_value?: number;
    purchase_value?: number | null;
    purchase_date?: string | null;
    currency?: string;
    notes?: string | null;
    is_liquid?: boolean;
    institution?: string | null;
    location?: string;
    surface_m2?: number;
    price_per_m2_purchase?: number;
    quantity?: number | null;
    rental_income?: number | null;
    // Tontine specific
    tontine_monthly_contribution?: number | null;
    tontine_participants?: number | null;
    tontine_start_date?: string | null;
    tontine_collection_date?: string | null;
    tontine_status?: string | null;
    tontine_frequency?: string | null;
    // Mobile Money specific
    mobile_money_operator?: string | null;
}

// ============================================
// TRANSACTION INTERFACES
// ============================================
export interface FxRatesResponse {
    base: string;
    rates: Record<string, number>;
    as_of: string | null;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
export type TransactionCategory =
    // Income
    | 'salary' | 'freelance' | 'dividends' | 'rental_income' | 'interest' | 'gift_received'
    | 'family_support_received' | 'tontine_payout' | 'other_income'
    // Expense
    | 'housing' | 'utilities' | 'groceries' | 'transport' | 'health' | 'insurance'
    | 'entertainment' | 'dining' | 'shopping' | 'education' | 'subscriptions'
    | 'travel' | 'gift_given' | 'family_support' | 'religious' | 'ceremony' | 'airtime' | 'tontine'
    | 'taxes' | 'savings' | 'investment' | 'debt_payment' | 'other_expense'
    // Transfer
    | 'transfer'
    // PRO-4: user-defined categories arrive as the sentinel "custom:<id>". The
    // `string & {}` keeps built-in literal autocomplete while admitting any string.
    | (string & {});

// PRO-4: user-defined categories. `value` is the "custom:<id>" sentinel stored
// on transactions/budgets.
export type CustomCategoryKind = 'income' | 'expense';

export interface CustomCategory {
    id: number;
    value: string;            // "custom:<id>"
    label: string;
    kind: CustomCategoryKind;
    icon: string | null;
    color: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomCategoryCreate {
    label: string;
    kind: CustomCategoryKind;
    icon?: string | null;
    color?: string | null;
}

// ── Custom alert rules (S13 PRO-1) ──────────────────────────────────────────
export type AlertRuleType = 'category_spend' | 'balance_floor' | 'goal_deadline';

export interface AlertRule {
    id: number;
    rule_type: AlertRuleType;
    category: string | null;
    account_id: number | null;
    goal_id: number | null;
    threshold: number | null;
    threshold_currency: string | null;
    days_before: number | null;
    is_active: boolean;
}

export interface AlertRuleCreate {
    rule_type: AlertRuleType;
    category?: string | null;
    account_id?: number | null;
    goal_id?: number | null;
    threshold?: number | null;
    threshold_currency?: string | null;
    days_before?: number | null;
}

export interface Transaction {
    id: number;
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    currency: string;
    description: string | null;
    date: string;
    is_recurring: boolean;
    recurring_frequency: string | null;
    account_id: number | null;
    from_account_id: number | null;
    to_account_id: number | null;
    account_name: string | null;
    from_account_name: string | null;
    to_account_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface TransactionCreate {
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    currency?: string;
    description?: string;
    date?: string;
    is_recurring?: boolean;
    recurring_frequency?: string;
    account_id?: number;
    from_account_id?: number;
    to_account_id?: number;
}

export interface TransactionUpdate {
    type?: TransactionType;
    category?: TransactionCategory;
    amount?: number;
    currency?: string;
    description?: string;
    date?: string;
    is_recurring?: boolean;
    recurring_frequency?: string;
    account_id?: number;
    from_account_id?: number;
    to_account_id?: number;
}

// ============================================
// SAVING GOAL INTERFACES
// ============================================
export type SavingStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface SavingGoal {
    id: number;
    owner_id?: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    target_amount: number;
    current_amount: number;
    monthly_contribution: number | null;
    target_date: string | null;
    start_date: string | null;
    priority: number;
    is_completed: boolean;
    is_active: boolean;
    progress_percentage?: number;
    remaining_amount?: number;
    template_key: string | null;
    image_url: string | null;
    share_token?: string | null;
    created_at: string;
    updated_at: string;
    // Legacy/optional, not returned by the backend, kept for compat with older callers
    currency?: string;
    status?: SavingStatus;
    notes?: string | null;
}

export interface ShareGoalResult {
    share_token: string;
    share_path: string;
}

export interface PublicGoal {
    name: string;
    image_url: string | null;
    template_key: string | null;
    progress_percentage: number;
    current_amount: number;   // EUR base
    target_amount: number;    // EUR base
    currency: string;
    currency_symbol: string;
    target_date: string | null;
    is_completed: boolean;
    owner_name: string | null;
}

// ── Portfolio sharing ("Bilan partageable"), public, Finary-style ───────
export interface PortfolioShareInfo {
    id: number;
    token: string;
    share_path: string;         // "/share/<token>", prefix with the origin
    categories: string[] | null;
    share_budget: boolean;
    hide_values: boolean;
    has_access_code: boolean;
    expires_at: string;
    revoked_at: string | null;
    status: 'active' | 'expired' | 'revoked';
    view_count: number;
    last_viewed_at: string | null;
    created_at: string;
}
export interface PortfolioShareCreate {
    categories?: string[] | null;   // AssetCategory values to include (null = all)
    share_budget?: boolean;         // include income/expense transactions (default true)
    hide_values?: boolean;          // strip amounts/quantities server-side
    access_code?: string | null;    // optional passcode gate
    expires_in_days?: 7 | 30;
}

export interface SavingGoalCreate {
    name: string;
    description?: string;
    target_amount: number;
    current_amount?: number;
    target_date?: string;
    priority?: number;
    template_key?: string;
    image_url?: string;
}

export interface SavingGoalUpdate {
    name?: string;
    description?: string;
    target_amount?: number;
    current_amount?: number;
    target_date?: string;
    priority?: number;
    template_key?: string;
    image_url?: string;
}

// ============================================
// GOAL CONTRIBUTION INTERFACES
// ============================================
export type GoalContributionType = 'contribution' | 'deallocation';

export interface GoalContribution {
    id: number;
    goal_id: number;
    asset_id: number | null;
    asset_name: string | null;
    asset_category: string | null;
    type: GoalContributionType;
    amount: number;
    date: string;          // ISO YYYY-MM-DD
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface GoalContributionCreate {
    asset_id: number;
    amount: number;        // always positive
    date?: string;         // ISO YYYY-MM-DD; defaults to today
    notes?: string;
}

export interface LiquidAsset {
    id: number;
    name: string;
    category: string;
    current_value: number;
    currency: string;
    institution: string | null;
}

// ── Recurring rules (Sprint 3) ──────────────────────────────────────────────
export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
    id: number;
    owner_id: number;
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    currency: string;
    description: string | null;
    merchant: string | null;
    account_id: number | null;
    from_account_id: number | null;
    to_account_id: number | null;
    frequency: RecurringFrequency;
    interval: number;
    start_date: string;
    next_run_date: string;
    end_date: string | null;
    last_run_date: string | null;
    is_active: boolean;
}

export interface RecurringRuleCreate {
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    currency: string;
    description?: string | null;
    account_id?: number | null;
    from_account_id?: number | null;
    to_account_id?: number | null;
    frequency: RecurringFrequency;
    interval?: number;
    start_date: string;
    end_date?: string | null;
}

// ── Budgets (Sprint 4) ──────────────────────────────────────────────────────
export type BudgetPeriod = 'monthly';

export interface Budget {
    id: number;
    category: TransactionCategory;
    period: BudgetPeriod;
    limit_amount: number | null;       // envelope model
    percent_of_income: number | null;  // flexible model
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface BudgetCreate {
    category: TransactionCategory;
    period?: BudgetPeriod;
    limit_amount?: number | null;
    percent_of_income?: number | null;
    currency?: string;
}

export interface BudgetUpdate {
    limit_amount?: number | null;
    percent_of_income?: number | null;
    currency?: string;
    is_active?: boolean;
}

export interface BudgetStatus {
    budget_id: number;
    category: TransactionCategory;
    model: 'envelope' | 'flexible';
    budgeted: number;      // effective cap, EUR base
    spent: number;         // category spend in the period, EUR base
    remaining: number;
    percent_used: number;
    over_budget: boolean;
}

export interface BudgetStatusResponse {
    period: string;        // YYYY-MM
    total_budgeted: number;
    total_spent: number;
    items: BudgetStatus[];
}

// ── Insights + alerts (Sprint 4) ────────────────────────────────────────────
export interface CategoryDelta {
    category: TransactionCategory;
    amount: number;
    prev_amount: number;
    delta: number;
    delta_pct: number | null;
}

export interface TrendPoint {
    period: string;        // YYYY-MM
    income: number;
    expenses: number;
    net: number;
}

export interface InsightAnomaly {
    category: TransactionCategory;
    amount: number;
    average: number;
    ratio: number;
}

export interface InsightsResponse {
    period: string;
    income: number;
    expenses: number;
    net: number;
    savings_rate: number;
    expenses_by_category: CategoryDelta[];
    trend: TrendPoint[];
    anomalies: InsightAnomaly[];
}

/** Support contact form payload (Settings -> Aide). */
export interface ContactMessage {
    fullName: string;
    email: string;
    company: string;
    needType: string;
    message: string;
}

/** One notification-center entry (P1-1). `text` is already resolved to the
 *  user's stored `preferred_language` server-side, so it is rendered as-is.
 *  `link` holds a MOBILE route and is deliberately NOT navigated verbatim on
 *  the web: see NOTIF_WEB_ROUTES in notification-center.service.ts. */
export interface InboxItem {
    id: number;
    kind: string;
    text: string;
    link: string;
    read: boolean;
    created_at: string;
}

export interface InboxResponse {
    items: InboxItem[];
    unread_count: number;
}

/** Coaching (Sprint 6). A recommendation carries WHY (metrics/amounts/context
 *  populate the i18n "because" clause) and WHAT NEXT (action label + deep-link).
 *  `amounts` are EUR-base (format via CurrencyService, EUR→display); `metrics`
 *  are already-final plain numbers, render as-is. */
export interface CoachingRecommendation {
    id: string;
    rule: string;
    severity: 'high' | 'medium' | 'low';
    axis: string | null;
    title_key: string;
    detail_key: string;
    action_key: string;
    action_route: string;
    metrics: Record<string, number>;
    amounts: Record<string, number>;
    context: Record<string, string>;
}

export interface CoachingResponse {
    generated_at: string;
    recommendations: CoachingRecommendation[];
}

// ── Import pipeline (Sprint 3: CSV -> transactions) ─────────────────────────
/**
 * Column mapping sent (JSON-encoded) in the `mapping` form field of
 * POST /imports/transactions/parse. Mirrors the backend `ColumnMapping`
 * dataclass: a single signed `amount` column OR a split `debit`/`credit` pair.
 */
export interface ColumnMapping {
    date: string;
    description: string;
    amount?: string | null;            // single signed-amount column...
    debit?: string | null;             // ...OR a split debit/credit pair
    credit?: string | null;
    currency?: string | null;          // column holding a currency code
    reference?: string | null;         // column holding a bank reference
    date_format?: string | null;       // explicit strptime; else auto-detect
    decimal?: string;                  // decimal separator (default ".")
    default_currency?: string;         // fallback currency (default "EUR")
    expense_is_negative?: boolean;     // sign convention for a single amount col
    delimiter?: string | null;         // override the sniffed delimiter
}

export interface ColumnsPreviewResponse {
    headers: string[];
    sample_rows: Record<string, unknown>[];
}

export interface TxnPreviewItem {
    date: string;                      // ISO YYYY-MM-DD
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    currency: string;
    description: string;
    external_ref: string | null;
    import_ref: string;
    is_duplicate: boolean;             // already imported (same import_ref) — skipped
    possible_duplicate: boolean;       // may match a hand-entered row — soft warning
}

export interface TxnPreviewResponse {
    items: TxnPreviewItem[];
    total: number;
    duplicates: number;
}

export interface TxnCommitItem {
    date: string;                      // ISO YYYY-MM-DD
    amount: number;                    // must be > 0
    type: TransactionType;
    category: TransactionCategory;
    currency?: string;                 // strict ISO code (default "EUR")
    description?: string | null;
    import_ref?: string | null;
}

export interface TxnCommitRequest {
    account_id: number;                // the monetary account this statement belongs to
    items: TxnCommitItem[];
}

export interface ImportCommitResult {
    created: number;
    skipped: number;
}

// ── Import pipeline (Sprint 3: broker PDF -> holdings/assets) ────────────────
export interface HoldingPreviewItem {
    name: string;
    category: AssetCategory;
    current_value: number;
    currency: string;
    quantity: number | null;
    purchase_value: number | null;
    institution: string | null;
}

export interface HoldingsPreviewResponse {
    holdings: HoldingPreviewItem[];
    text: string;                      // raw extracted text (truncated) for manual review
}

export interface HoldingCommitItem {
    name: string;
    category: AssetCategory;
    current_value: number;             // must be >= 0
    currency?: string;                 // strict ISO code (default "XOF")
    quantity?: number | null;
    purchase_value?: number | null;    // >= 0 when present
    institution?: string | null;
}

export interface HoldingCommitRequest {
    items: HoldingCommitItem[];
}

// ============================================
// DEBT INTERFACES
// ============================================
export type DebtType = 'i_owe' | 'owed_to_me';
export type DebtCategory = 'mortgage' | 'car_loan' | 'student_loan' | 'personal_loan' | 'credit_card' | 'family_friend' | 'business' | 'other';

export interface Debt {
    id: number;
    owner_id: number;
    name: string;
    type: DebtType;
    category: DebtCategory;
    description: string | null;
    initial_amount: number;
    current_amount: number;
    /** ISO 4217 code the amounts are denominated in (native currency). */
    currency: string;
    interest_rate: number | null;
    monthly_payment: number | null;
    next_payment_date: string | null;
    start_date: string | null;
    end_date: string | null;
    creditor_name: string | null;
    is_paid_off: boolean;
    is_active: boolean;
    progress_percentage: number;
    amount_paid: number;
    created_at: string;
    updated_at: string;
}

export interface DebtCreate {
    name: string;
    type: DebtType;
    category: DebtCategory;
    description?: string;
    initial_amount: number;
    current_amount: number;
    currency?: string;
    interest_rate?: number;
    monthly_payment?: number;
    next_payment_date?: string;
    start_date?: string;
    end_date?: string;
    creditor_name?: string;
}

export interface DebtUpdate {
    name?: string;
    type?: DebtType;
    category?: DebtCategory;
    description?: string;
    initial_amount?: number;
    current_amount?: number;
    currency?: string;
    interest_rate?: number;
    monthly_payment?: number;
    next_payment_date?: string;
    end_date?: string;
    creditor_name?: string;
    is_paid_off?: boolean;
    is_active?: boolean;
}

// ============================================
// DASHBOARD INTERFACES
// ============================================
export interface AssetDistribution {
    category: string;
    value: number;
    percentage: number;
}

export interface WorthProgression {
    date: string;
    total_assets: number;
    total_debts: number;
    net_worth: number;
    /** false when the point is a real persisted snapshot (or today's live
     *  totals); true when it was rebuilt from the assets' own series because no
     *  snapshot exists for that month. Never a straight-line guess. */
    estimated?: boolean;
}

/**
 * Canonical FIRE-metrics contract, matches the backend `FireMetricsSummary`
 * Pydantic schema nested in GET /dashboard/summary. One field-name set
 * end-to-end (P1-18); the old `?? ` field-name guessing chain is gone.
 */
export interface FireMetrics {
    current_net_worth: number;
    fire_target: number;
    progress_percentage: number;
    monthly_savings_rate: number;
    estimated_fire_date: string | null;
    years_to_fire: number | null;
    monthly_passive_income_needed: number;
    current_passive_income: number;
}
/** @deprecated legacy alias, use FireMetrics. */
export type FIREMetrics = FireMetrics;

export interface DashboardSummary {
    total_assets: number;
    total_debts: number;
    net_worth: number;
    net_worth_change_30d: number;
    net_worth_change_percentage: number;
    monthly_income: number;
    monthly_expenses: number;
    savings_rate: number;
    asset_distribution: AssetDistribution[];
    worth_progression: WorthProgression[];
    fire_metrics: FireMetrics;
}

// ============================================
// USER UPDATE INTERFACES
// ============================================
export interface UserUpdate {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    preferred_currency?: string;
    preferred_language?: string;
    fire_target_amount?: number;
    fire_target_date?: string;
    fire_monthly_expenses?: number;
    fire_safe_withdrawal_rate?: number;
}

export interface PasswordChange {
    current_password: string;
    new_password: string;
}

export interface FIRESettings {
    fire_target_amount?: number | null;
    fire_target_date?: string | null;
    annual_expenses?: number | null;
    withdrawal_rate?: number;
}

export interface SubScore {
    label: string;
    score: number;
    max_score: number;
    raw_value: number;
}

export interface AxisScore {
    axis: string;
    score: number;
    max_score: number;
    sub_scores: SubScore[];
    insight_key: string;
}

export interface WealthScoreResponse {
    total_score: number;
    axes: AxisScore[];
    computed_at: string;
}

// ============================================
// BROKER CONNECTION INTERFACES
// ============================================
export type BrokerProvider =
    | 'jokko_fi' | 'cgf_bourse' | 'bridge_securities'
    | 'credit_agricole' | 'boursobank' | 'credit_mutuel' | 'trade_republic' | 'fortuneo';
export type ConnectionStatus = 'pending' | 'connected' | 'error' | 'disabled';

export interface BrokerConnectionCreate {
    provider: BrokerProvider;
    login: string;
    password: string;
}

export interface BrokerConnectionUpdate {
    login?: string;
    password?: string;
}

export interface BrokerConnection {
    id: number;
    provider: BrokerProvider;
    login: string;
    status: ConnectionStatus;
    last_sync: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// NOTIFICATIONS (S9-B3)
// ============================================
export interface NotificationPreferences {
    email_enabled: boolean;
    push_enabled: boolean;
    signal_budget: boolean;
    signal_tontine: boolean;
    signal_milestone: boolean;   // S13 AI-72: FIRE-milestone alerts
    signal_weekly_report: boolean;  // S13 PRO-2: weekly Pro recap email (opt-out)
    signal_custom_rules: boolean;   // S13 PRO-1: master switch for custom alert rules
    quiet_hours_start: string;   // "HH:MM" local time
    quiet_hours_end: string;
    timezone: string;            // IANA name
}

export interface PushDevice {
    id: number;
    endpoint: string;
    user_agent: string | null;
}

// ============================================
// BILLING / SUBSCRIPTION (S11)
// ============================================
export type PlanTierName = 'free' | 'pro' | 'premium';
export type SubscriptionStatusName = 'active' | 'past_due' | 'expired' | 'cancelled';
export type RenewalTypeName = 'prepaid' | 'auto';
export type PaymentMethod = 'momo' | 'card';
export type DurationKey = 'd15' | 'm1' | 'm3' | 'm6';

/** One rung of the server-authoritative pricing ladder (GET /billing/plans).
 *  XOF and EUR are set independently — never an FX conversion; the FE picks by
 *  the user's display currency and formats with `formatDisplayNumber`. */
export interface PlanDurationPrice {
    duration_key: DurationKey;
    label: string;
    days: number;
    xof: number;
    eur: number;
}
export interface PlanPricing {
    plan: 'pro' | 'premium';
    durations: PlanDurationPrice[];
}
export interface PlansResponse {
    plans: PlanPricing[];
}

/** Current entitlement + the paid-subscription row when one exists.
 *  `effective_plan` is FREE until a paid pass is active (it does NOT fold in the
 *  beta courtesy); read `beta_courtesy` for the "Pro offert (beta)" state. */
export interface SubscriptionStatus {
    effective_plan: PlanTierName;
    beta_courtesy: boolean;
    plan: PlanTierName | null;
    status: SubscriptionStatusName | null;
    renewal_type: RenewalTypeName | null;
    current_period_end: string | null;
    cancel_at: string | null;
    /** The paid period has ended but access persists for a few more days.
     *  Without this the card could only say "Active / expires in 0 days",
     *  which hid the lapse instead of prompting a renewal. */
    in_grace: boolean;
    grace_ends_at: string | null;
}

/** AI usage meter for one bucket. `period_end` is the reset date for a period
 *  window; null for a lifetime bucket (free setup grant, Pro advisor preview). */
export interface UsageStatus {
    used: number;
    limit: number;
    remaining: number;
    kind: 'premium' | 'pro' | 'free_trial';
    period_start: string | null;
    period_end: string | null;
    exceeded: boolean;
    warning: boolean;
    /** Allowlisted test/demo account: never gated (meter shows "unlimited"). */
    exempt?: boolean;
    /** PREM-4: the two buckets, present on the /billing/usage response. The
     *  flat fields above mirror `config` for backward compatibility. `advisor`
     *  is the paid read-only advisor (Premium monthly quota, Pro lifetime
     *  preview, none for free). Absent on a nested bucket object itself. */
    config?: UsageStatus;
    advisor?: UsageStatus;
}

export interface CheckoutRequest {
    plan: 'pro' | 'premium';
    duration_key: DurationKey;
    method: PaymentMethod;
}
export interface CheckoutResponse {
    reference: string;
    checkout_url: string;
    amount: number;
    currency: string;
    method: string;
}

/** One row of the subscription payment ledger (Abonnement → Historique).
 *  `amount` is what was charged, in `currency` (XOF or EUR) — display it with
 *  that currency's own symbol, never converted to the user's display currency. */
export interface PaymentHistoryItem {
    reference: string;
    plan: 'pro' | 'premium';
    duration_key: DurationKey;
    duration_label: string;
    amount: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed';
    created_at: string;
    confirmed_at: string | null;
}

// ============================================
// API SERVICE
// ============================================
@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private http = inject(HttpClient);
    private share = inject(ShareContextService);
    private apiUrl = environment.apiUrl;

    /**
     * In share mode, resolve a read from the frozen bundle instead of HTTP.
     * Returns null when NOT in share mode so callers fall through to `this.http`.
     */
    private shared<T>(pick: (b: PublicPortfolioBundle) => T | undefined): Observable<T> | null {
        const b = this.share.bundle();
        if (!b) return null;
        return of(pick(b) as T);
    }

    /** Write guard: mutations are impossible on a read-only public share. */
    private get readonlyBlock(): Observable<never> {
        return throwError(() => new Error('This portfolio is shared read-only.'));
    }

    /** Public, unauthenticated portfolio bundle for /share/:token. */
    getPublicPortfolio(token: string, code?: string): Observable<PublicPortfolioBundle> {
        let params = new HttpParams();
        if (code) params = params.set('code', code);
        return this.http.get<{ meta: unknown; snapshot: PublicPortfolioBundle }>(
            `${this.apiUrl}/public/portfolio/${token}`, { params },
        ).pipe(map(r => r.snapshot));
    }

    // ========== WAITLIST / LEADS (public, no auth) ==========
    /** Capture a pre-launch waitlist email (public funnel). Idempotent server-side. */
    submitLead(email: string, source: string, locale: string): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(`${this.apiUrl}/leads`, { email, source, locale });
    }

    // ========== AI ASSISTANT FEEDBACK (S12 task 2.9) ==========
    /**
     * Record a 👍/👎 on one assistant message. Owner-scoped server-side (JWT);
     * upserts by (user, message id) so toggling overwrites. `reason` is only
     * meaningful on a 👎. No message text is sent.
     */
    postAssistantFeedback(
        clientMessageId: string, rating: FeedbackRating, reason?: FeedbackReason,
    ): Observable<{ ok: boolean; rating: FeedbackRating; reason: FeedbackReason | null }> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<{ ok: boolean; rating: FeedbackRating; reason: FeedbackReason | null }>(
            `${this.apiUrl}/agents/feedback`,
            { client_message_id: clientMessageId, rating, reason: reason ?? null },
        );
    }

    // ========== NEWSLETTER (FIRE Africa, public, no auth) ==========
    /**
     * Subscribe an email to the FIRE Africa newsletter. Stored first-party, then
     * best-effort forwarded to Beehiiv. Idempotent server-side. `forwarded` says
     * whether Beehiiv accepted it (false when Beehiiv is not configured yet).
     */
    subscribeNewsletter(payload: {
        email: string;
        source?: string;
        locale?: string;
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
    }): Observable<{ ok: boolean; forwarded: boolean }> {
        return this.http.post<{ ok: boolean; forwarded: boolean }>(
            `${this.apiUrl}/newsletter/subscribe`, payload,
        );
    }

    // ========== FX RATES ==========
    /** Public conversion rates relative to EUR base (see backend /fx/rates). */
    getFxRates(): Observable<FxRatesResponse> {
        return this.shared<FxRatesResponse>(b => b.fx_rates)
            ?? this.http.get<FxRatesResponse>(`${this.apiUrl}/fx/rates`);
    }

    // ========== DATA EXPORT ==========
    /** Full account export as a JSON blob (auth added by the interceptor). */
    exportDataJson(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/export/data.json`, { responseType: 'blob' });
    }

    /** Transactions as a CSV blob. */
    exportTransactionsCsv(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/export/transactions.csv`, { responseType: 'blob' });
    }

    /** S13 AI-73: the Pro monthly report as a PDF blob (auth via interceptor).
     *  No args => the most recent complete month. A 403 means the plan gate. */
    downloadMonthlyReport(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/reports/monthly.pdf`, { responseType: 'blob' });
    }

    // ========== ASSETS ==========
    getAssets(skip = 0, limit = 100): Observable<Asset[]> {
        const s = this.shared<Asset[]>(b => b.assets);
        if (s) return s;
        const params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        return this.http.get<Asset[]>(`${this.apiUrl}/assets`, { params });
    }

    getAsset(id: number): Observable<Asset> {
        return this.shared<Asset>(b => b.assets.find(a => a.id === id))
            ?? this.http.get<Asset>(`${this.apiUrl}/assets/${id}`);
    }

    /** An asset's real value series + per-month variation, for ANY asset kind.
     *  Free (unlike the BRVM panel below): it replaces the decorative chart
     *  every asset used to show. */
    getAssetHistory(id: number, months = 12): Observable<AssetHistory> {
        const params = new HttpParams().set('months', months.toString());
        return this.http.get<AssetHistory>(`${this.apiUrl}/assets/${id}/history`, { params });
    }

    /** The combined REAL value series for a group of asset categories, in EUR
     *  base (a group can mix currencies, so the server converts once). Backs the
     *  patrimoine category chart. */
    getCategoryHistory(categories: string[], months = 12, granularity: 'month' | 'day' = 'month'): Observable<CategoryHistory> {
        let params = new HttpParams()
            .set('categories', categories.join(','))
            .set('months', months.toString());
        if (granularity === 'day') params = params.set('granularity', 'day');
        return this.http.get<CategoryHistory>(`${this.apiUrl}/assets/history/by-category`, { params });
    }

    /** PRO-3: BRVM price history + per-title performance for a catalog-keyed
     *  BRVM stock or FCP. Pro-gated server-side. `days` optionally windows the
     *  price series to the most recent N days. */
    getAssetBrvmHistory(id: number, days?: number): Observable<BrvmHistory> {
        let params = new HttpParams();
        if (days != null) params = params.set('days', days.toString());
        return this.http.get<BrvmHistory>(`${this.apiUrl}/assets/${id}/brvm-history`, { params });
    }

    /** Whole-sleeve BRVM analytics (stocks + FCP) for the Patrimoine "Analyse
     *  BRVM" page. Pro-gated server-side (403 PLAN_REQUIRED). Fetched widest
     *  once; the page slices the series per range chip client-side. */
    getBrvmPortfolio(days?: number): Observable<BrvmPortfolio> {
        let params = new HttpParams();
        if (days != null) params = params.set('days', days.toString());
        return this.http.get<BrvmPortfolio>(`${this.apiUrl}/assets/brvm-portfolio`, { params });
    }

    /** First-run gate (S12 Phase 6): true when the user has no assets and has not
     *  completed onboarding, so the FE routes them into the concierge. */
    getOnboardingStatus(): Observable<{ should_onboard: boolean }> {
        return this.http.get<{ should_onboard: boolean }>(`${this.apiUrl}/agents/onboarding-status`);
    }

    /** Pre-warm the onboarding prompt cache (S12 Phase 6) so the first concierge
     *  tap is fast (~2-3s) instead of the cold start. Fire-and-forget on page load. */
    warmOnboarding(): Observable<{ warmed: boolean }> {
        return this.http.post<{ warmed: boolean }>(`${this.apiUrl}/agents/onboarding/warm`, {});
    }

    /** Pre-warm the chat prompt cache on assistant-page entry (AI kanban PERF-4):
     *  the backend warms the bundle the user's first message would land on, so
     *  the first token arrives from a warm prefix. Fire-and-forget; best-effort. */
    warmChat(): Observable<{ warmed: boolean; agent: string }> {
        return this.http.post<{ warmed: boolean; agent: string }>(`${this.apiUrl}/agents/warm`, {});
    }

    /** Start a fresh conversation: clears the agent's server-side memory (DB
     *  message window + rolling summary + open Config gather) so the next turn
     *  carries no prior context. The audit/usage trail is untouched. */
    resetConversation(): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(`${this.apiUrl}/agents/conversation/reset`, {});
    }

    /** Deterministic first-run write (S12 Phase 6): runs one tool through the
     *  audited pipeline with NO model call, so the tap-first concierge never
     *  depends on an LLM correctly translating a tap into a tool call. */
    onboardingAction(
        tool: 'update_user_ai_profile' | 'create_asset' | 'mark_onboarding_complete',
        args: Record<string, unknown>,
    ): Observable<{ status: string; summary?: string; undo_token?: string | null }> {
        return this.http.post<{ status: string; summary?: string; undo_token?: string | null }>(
            `${this.apiUrl}/agents/onboarding/action`, { tool, args },
        );
    }

    createAsset(data: AssetCreate): Observable<Asset> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<Asset>(`${this.apiUrl}/assets`, data);
    }

    updateAsset(id: number, data: AssetUpdate): Observable<Asset> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.patch<Asset>(`${this.apiUrl}/assets/${id}`, data);
    }

    deleteAsset(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/assets/${id}`);
    }

    /** The pickable BRVM equity universe (S9-B1): reference data for the picker. */
    getBrvmInstruments(): Observable<BrvmInstrument[]> {
        return this.http.get<BrvmInstrument[]>(`${this.apiUrl}/market/brvm/instruments`);
    }

    /** The pickable FCP/OPCVM fund universe: reference data for the picker. */
    getFcpInstruments(): Observable<FcpInstrument[]> {
        return this.http.get<FcpInstrument[]>(`${this.apiUrl}/market/fcp/instruments`);
    }

    // ========== MARCHÉS (P2-3): free market surface, auth-only like the pickers ==========
    /** Headline BRVM indices with spark series and the ambient market status. */
    getBrvmIndices(): Observable<BrvmIndicesResponse> {
        return this.http.get<BrvmIndicesResponse>(`${this.apiUrl}/market/brvm/indices`);
    }

    /** Stored EOD series for one index code (e.g. 'BRVM-C'); 404 on unknown code. */
    getBrvmIndexHistory(code: string): Observable<BrvmIndexHistoryResponse> {
        return this.http.get<BrvmIndexHistoryResponse>(`${this.apiUrl}/market/brvm/indices/${encodeURIComponent(code)}/history`);
    }

    /** Latest close per listed equity with day change (XOF, alphabetical). */
    getBrvmQuotes(): Observable<BrvmBoardQuote[]> {
        return this.http.get<BrvmBoardQuote[]>(`${this.apiUrl}/market/brvm/quotes`);
    }

    /** Raw market price series for one ticker. The personal P&L history stays on
     *  /assets/{id}/brvm-history (Pro); this one is market data, free. */
    getBrvmTickerHistory(ticker: string): Observable<BrvmTickerHistoryResponse> {
        return this.http.get<BrvmTickerHistoryResponse>(`${this.apiUrl}/market/brvm/instruments/${encodeURIComponent(ticker)}/history`);
    }

    /** Stored VL series for one fund; VLs publish weekly so the series is sparse. */
    getFcpVlHistory(slug: string): Observable<FcpVlHistoryResponse> {
        return this.http.get<FcpVlHistoryResponse>(`${this.apiUrl}/market/fcp/instruments/${encodeURIComponent(slug)}/history`);
    }

    // ========== WEEKLY RECAP (P2-4) ==========
    /** The last completed 7 days (window ending yesterday), Pro-gated: a free
     *  user gets 403 {code: 'PLAN_REQUIRED'}, which the page turns into an
     *  upsell, never an error state. */
    getWeeklyReport(): Observable<WeeklyReportBundle> {
        return this.http.get<WeeklyReportBundle>(`${this.apiUrl}/reports/weekly`);
    }

    // ========== TONTINE CYCLES ==========
    getTontineSchedule(assetId: number): Observable<TontineSchedule | null> {
        // Not carried in the public bundle, yield null in share mode (callers
        // already handle a null schedule; the old `null as unknown as X` cast
        // lied to the type system and invited NPEs).
        if (this.share.active()) return of(null);
        return this.http.get<TontineSchedule>(`${this.apiUrl}/assets/${assetId}/tontine`);
    }

    setTontineCycle(assetId: number, cycleNumber: number, body: TontineCyclePay): Observable<TontineSchedule> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<TontineSchedule>(
            `${this.apiUrl}/assets/${assetId}/tontine/cycles/${cycleNumber}`, body);
    }

    // ========== TRANSACTIONS ==========
    getTransactions(
        skip = 0,
        limit = 100,
        type?: TransactionType,
        startDate?: string,
        endDate?: string,
    ): Observable<Transaction[]> {
        const s = this.shared<Transaction[]>(b => this.filterBundleTransactions(b.transactions, type, startDate, endDate));
        if (s) return s;
        let params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        if (type) {
            params = params.set('type', type);
        }
        if (startDate) {
            params = params.set('start_date', startDate);
        }
        if (endDate) {
            params = params.set('end_date', endDate);
        }
        return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`, { params });
    }

    /**
     * Fetch EVERY transaction (optionally filtered by type and/or date range),
     * paginating past the server's per-page cap so callers never silently
     * truncate history. Share mode returns the frozen bundle (filtered) in one shot.
     *
     * Note: this pulls the full set into memory, correct and cheap at current
     * data volumes. Server-side per-month aggregation is tracked in P2-BE-5.
     */
    getAllTransactions(type?: TransactionType, startDate?: string, endDate?: string): Observable<Transaction[]> {
        const s = this.shared<Transaction[]>(b => this.filterBundleTransactions(b.transactions, type, startDate, endDate));
        if (s) return s;
        return from(this.fetchAllTransactions(type, startDate, endDate));
    }

    private filterBundleTransactions(
        txs: Transaction[],
        type?: TransactionType,
        startDate?: string,
        endDate?: string,
    ): Transaction[] {
        let out = type ? txs.filter(t => t.type === type) : txs;
        if (startDate) out = out.filter(t => t.date >= startDate);
        if (endDate) out = out.filter(t => t.date <= endDate);
        return out;
    }

    private async fetchAllTransactions(
        type?: TransactionType,
        startDate?: string,
        endDate?: string,
    ): Promise<Transaction[]> {
        // Max page size (server caps limit at 500): pages are fetched
        // SEQUENTIALLY, so on a slow backend every extra page is a full extra
        // round-trip serialized in front of the transactions screen.
        const page = 500;
        const all: Transaction[] = [];
        for (let skip = 0; ; skip += page) {
            const batch = await firstValueFrom(this.getTransactions(skip, page, type, startDate, endDate));
            all.push(...batch);
            if (batch.length < page) return all;
        }
    }

    getTransaction(id: number): Observable<Transaction> {
        return this.shared<Transaction>(b => b.transactions.find(t => t.id === id))
            ?? this.http.get<Transaction>(`${this.apiUrl}/transactions/${id}`);
    }

    createTransaction(data: TransactionCreate): Observable<Transaction> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<Transaction>(`${this.apiUrl}/transactions`, data);
    }

    updateTransaction(id: number, data: TransactionUpdate): Observable<Transaction> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.patch<Transaction>(`${this.apiUrl}/transactions/${id}`, data);
    }

    deleteTransaction(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/transactions/${id}`);
    }

    // ========== SAVING GOALS ==========
    getSavingGoals(skip = 0, limit = 100): Observable<SavingGoal[]> {
        const s = this.shared<SavingGoal[]>(b => b.saving_goals);
        if (s) return s;
        const params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        return this.http.get<SavingGoal[]>(`${this.apiUrl}/savings`, { params });
    }

    getSavingGoal(id: number): Observable<SavingGoal> {
        return this.shared<SavingGoal>(b => b.saving_goals.find(g => g.id === id))
            ?? this.http.get<SavingGoal>(`${this.apiUrl}/savings/${id}`);
    }

    // ── Read-only goal sharing ──────────────────────────────────────────────
    shareGoal(id: number): Observable<ShareGoalResult> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<ShareGoalResult>(`${this.apiUrl}/savings/${id}/share`, {});
    }

    unshareGoal(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/savings/${id}/share`);
    }

    /** Public, unauthenticated read-only goal view. */
    getPublicGoal(token: string): Observable<PublicGoal> {
        return this.http.get<PublicGoal>(`${this.apiUrl}/public/goals/${token}`);
    }

    // ── Portfolio sharing ("Bilan partageable") ─────────────────────────────
    createPortfolioShare(data: PortfolioShareCreate): Observable<PortfolioShareInfo> {
        return this.http.post<PortfolioShareInfo>(`${this.apiUrl}/portfolio/share`, data);
    }

    listPortfolioShares(): Observable<PortfolioShareInfo[]> {
        return this.http.get<PortfolioShareInfo[]>(`${this.apiUrl}/portfolio/shares`);
    }

    refreshPortfolioShare(id: number): Observable<PortfolioShareInfo> {
        return this.http.post<PortfolioShareInfo>(`${this.apiUrl}/portfolio/shares/${id}/refresh`, {});
    }

    revokePortfolioShare(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/portfolio/shares/${id}`);
    }

    /** Download a share's Wealth Statement PDF (owner-authed). */
    downloadWealthStatementPdf(shareId: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/portfolio/shares/${shareId}/statement.pdf`, { responseType: 'blob' });
    }

    createSavingGoal(data: SavingGoalCreate): Observable<SavingGoal> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<SavingGoal>(`${this.apiUrl}/savings`, data);
    }

    updateSavingGoal(id: number, data: SavingGoalUpdate): Observable<SavingGoal> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.patch<SavingGoal>(`${this.apiUrl}/savings/${id}`, data);
    }

    deleteSavingGoal(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/savings/${id}`);
    }


    listLiquidAssets(): Observable<LiquidAsset[]> {
        const s = this.shared<LiquidAsset[]>(b => (b.assets as any[]).filter(a => a.is_liquid) as LiquidAsset[]);
        if (s) return s;
        return this.http.get<LiquidAsset[]>(`${this.apiUrl}/savings/liquid-assets`);
    }

    listGoalContributions(goalId: number): Observable<GoalContribution[]> {
        // Not carried in the public bundle.
        if (this.share.active()) return of([] as GoalContribution[]);
        return this.http.get<GoalContribution[]>(`${this.apiUrl}/savings/${goalId}/contributions`);
    }

    contributeToGoal(goalId: number, data: GoalContributionCreate): Observable<GoalContribution> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<GoalContribution>(
            `${this.apiUrl}/savings/${goalId}/contribute`,
            data,
        );
    }

    deallocateFromGoal(goalId: number, data: GoalContributionCreate): Observable<GoalContribution> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<GoalContribution>(
            `${this.apiUrl}/savings/${goalId}/deallocate`,
            data,
        );
    }

    deleteGoalContribution(goalId: number, contributionId: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(
            `${this.apiUrl}/savings/${goalId}/contributions/${contributionId}`,
        );
    }

    // ========== DEBTS ==========
    getDebts(skip = 0, limit = 100): Observable<Debt[]> {
        const s = this.shared<Debt[]>(b => b.debts);
        if (s) return s;
        const params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        return this.http.get<Debt[]>(`${this.apiUrl}/debts`, { params });
    }

    getDebt(id: number): Observable<Debt> {
        return this.shared<Debt>(b => b.debts.find(d => d.id === id))
            ?? this.http.get<Debt>(`${this.apiUrl}/debts/${id}`);
    }

    createDebt(data: DebtCreate): Observable<Debt> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<Debt>(`${this.apiUrl}/debts`, data);
    }

    updateDebt(id: number, data: DebtUpdate): Observable<Debt> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.patch<Debt>(`${this.apiUrl}/debts/${id}`, data);
    }

    deleteDebt(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/debts/${id}`);
    }

    makePayment(debtId: number, amount: number): Observable<Debt> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<Debt>(`${this.apiUrl}/debts/${debtId}/payment`, { amount });
    }

    // ========== DASHBOARD ==========
    getDashboardSummary(): Observable<DashboardSummary> {
        return this.shared<DashboardSummary>(b => b.dashboard_summary)
            ?? this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard/summary`);
    }

    getFIREMetrics(): Observable<FireMetrics> {
        return this.shared<FireMetrics>(b => b.fire_metrics)
            ?? this.http.get<FireMetrics>(`${this.apiUrl}/dashboard/fire-metrics`);
    }

    getAssetDistribution(): Observable<AssetDistribution[]> {
        return this.shared<AssetDistribution[]>(b => b.asset_distribution)
            ?? this.http.get<AssetDistribution[]>(`${this.apiUrl}/dashboard/asset-distribution`);
    }

    getExpenseDistribution(): Observable<AssetDistribution[]> {
        return this.shared<AssetDistribution[]>(b => b.expense_distribution)
            ?? this.http.get<AssetDistribution[]>(`${this.apiUrl}/dashboard/expense-distribution`);
    }

    /** `granularity: 'day'` draws a rolling window of one point per calendar
     *  day (`months` back from today) instead of one snapshot per month. Only
     *  sent when asked, so the default URL, and the frozen public-share payload
     *  keyed on it, are unchanged. */
    getWorthProgression(months = 12, granularity: 'month' | 'day' = 'month'): Observable<WorthProgression[]> {
        const s = this.shared<WorthProgression[]>(b => b.worth_progression);
        if (s) return s;
        let params = new HttpParams().set('months', months.toString());
        if (granularity === 'day') params = params.set('granularity', 'day');
        return this.http.get<WorthProgression[]>(`${this.apiUrl}/dashboard/worth-progression`, { params });
    }

    // ========== USER PROFILE ==========
    updateProfile(data: UserUpdate): Observable<User> {
        return this.http.patch<User>(`${this.apiUrl}/users/me`, data);
    }

    changePassword(data: PasswordChange): Observable<{ message: string; access_token: string; token_type: string }> {
        return this.http.put<{ message: string; access_token: string; token_type: string }>(
            `${this.apiUrl}/users/me/password`, data
        );
    }

    updateFIRESettings(data: FIRESettings): Observable<User> {
        return this.http.put<User>(`${this.apiUrl}/users/me/fire-settings`, data);
    }

    /**
     * Record the answer to the AI consent sheet. One endpoint for all three
     * moments (first acceptance, refusal, later withdrawal from Settings)
     * because they write the same pair of columns; the full profile comes back
     * so the caller refreshes its cached user from the response instead of a
     * second round trip. Go through AiConsentService rather than calling this
     * directly, so the cached user is always updated with it.
     */
    setAiConsent(granted: boolean): Observable<User> {
        return this.http.put<User>(`${this.apiUrl}/users/me/ai-consent`, { granted });
    }

    uploadAvatar(file: File): Observable<User> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<User>(`${this.apiUrl}/users/me/avatar`, formData);
    }

    deleteAvatar(): Observable<User> {
        return this.http.delete<User>(`${this.apiUrl}/users/me/avatar`);
    }

    deleteAccount(): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/users/me`);
    }

    // ========== WEALTH SCORE ==========
    getWealthScore(): Observable<WealthScoreResponse> {
        return this.shared<WealthScoreResponse>(b => b.wealth_score)
            ?? this.http.get<WealthScoreResponse>(`${this.apiUrl}/wealth-score`);
    }

    // ========== BROKER CONNECTIONS ==========
    createBrokerConnection(data: BrokerConnectionCreate): Observable<BrokerConnection> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<BrokerConnection>(`${this.apiUrl}/broker/connections`, data);
    }

    getBrokerConnections(): Observable<BrokerConnection[]> {
        const s = this.shared<BrokerConnection[]>(() => []);
        if (s) return s;
        return this.http.get<BrokerConnection[]>(`${this.apiUrl}/broker/connections`);
    }

    updateBrokerConnection(id: number, data: BrokerConnectionUpdate): Observable<BrokerConnection> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.patch<BrokerConnection>(`${this.apiUrl}/broker/connections/${id}`, data);
    }

    deleteBrokerConnection(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/broker/connections/${id}`);
    }

    syncBrokerConnection(id: number): Observable<BrokerConnection> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<BrokerConnection>(`${this.apiUrl}/broker/connections/${id}/sync`, {});
    }

    // ── Recurring rules (Sprint 3) ──────────────────────────────────────────
    listRecurringRules(): Observable<RecurringRule[]> {
        return this.http.get<RecurringRule[]>(`${this.apiUrl}/recurring`);
    }

    createRecurringRule(data: RecurringRuleCreate): Observable<RecurringRule> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<RecurringRule>(`${this.apiUrl}/recurring`, data);
    }

    deleteRecurringRule(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/recurring/${id}`);
    }

    /** Materialize any due transactions for the current user (idempotent). */
    runRecurring(): Observable<{ created: number }> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<{ created: number }>(`${this.apiUrl}/recurring/run`, {});
    }

    // ── Import pipeline (Sprint 3) ──────────────────────────────────────────
    /** Upload a CSV and get back its headers + a few sample rows to build a mapping. */
    previewImportColumns(file: File): Observable<ColumnsPreviewResponse> {
        if (this.share.active()) return this.readonlyBlock;
        const fd = new FormData();
        fd.append('file', file);
        return this.http.post<ColumnsPreviewResponse>(
            `${this.apiUrl}/imports/transactions/preview-columns`, fd);
    }

    /**
     * Parse a CSV into a dedup-flagged, categorized preview (nothing is written).
     * `mapping` is JSON-encoded into the `mapping` form field, matching the backend.
     */
    parseImportTransactions(file: File, mapping: ColumnMapping): Observable<TxnPreviewResponse> {
        if (this.share.active()) return this.readonlyBlock;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('mapping', JSON.stringify(mapping));
        return this.http.post<TxnPreviewResponse>(
            `${this.apiUrl}/imports/transactions/parse`, fd);
    }

    /** Commit reviewed rows to a monetary account (idempotent: dedup via import_ref). */
    commitImportTransactions(req: TxnCommitRequest): Observable<ImportCommitResult> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<ImportCommitResult>(
            `${this.apiUrl}/imports/transactions/commit`, req);
    }

    /**
     * Parse a broker PDF into a preview of holdings plus the raw extracted text
     * (fallback for manual entry). Nothing is written.
     */
    parseImportHoldings(file: File, currency = 'XOF', institution?: string | null): Observable<HoldingsPreviewResponse> {
        if (this.share.active()) return this.readonlyBlock;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('currency', currency);
        if (institution) fd.append('institution', institution);
        return this.http.post<HoldingsPreviewResponse>(
            `${this.apiUrl}/imports/holdings/parse`, fd);
    }

    /** Commit reviewed holdings as new assets. */
    commitImportHoldings(req: HoldingCommitRequest): Observable<ImportCommitResult> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<ImportCommitResult>(
            `${this.apiUrl}/imports/holdings/commit`, req);
    }

    // ── Budgets (Sprint 4) ──────────────────────────────────────────────────
    listBudgets(): Observable<Budget[]> {
        return this.http.get<Budget[]>(`${this.apiUrl}/budgets`);
    }

    getBudgetStatus(period?: string): Observable<BudgetStatusResponse> {
        let params = new HttpParams();
        if (period) params = params.set('period', period);
        return this.http.get<BudgetStatusResponse>(`${this.apiUrl}/budgets/status`, { params });
    }

    createBudget(data: BudgetCreate): Observable<Budget> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<Budget>(`${this.apiUrl}/budgets`, data);
    }

    updateBudget(id: number, data: BudgetUpdate): Observable<Budget> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.patch<Budget>(`${this.apiUrl}/budgets/${id}`, data);
    }

    deleteBudget(id: number): Observable<void> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.delete<void>(`${this.apiUrl}/budgets/${id}`);
    }

    // ── Insights (Sprint 4) ─────────────────────────────────────────────────
    getInsights(period?: string, months = 6): Observable<InsightsResponse> {
        let params = new HttpParams().set('months', months.toString());
        if (period) params = params.set('period', period);
        return this.http.get<InsightsResponse>(`${this.apiUrl}/insights`, { params });
    }

    // ── Coaching (Sprint 6) ─────────────────────────────────────────────────
    getCoachingRecommendations(): Observable<CoachingResponse> {
        return this.http.get<CoachingResponse>(`${this.apiUrl}/coaching/recommendations`);
    }

    // ===== Notifications (S9-B3) =====

    /**
     * Last-known notification preferences, read synchronously from localStorage
     * so the Settings → Notifications page can paint the real toggle states on
     * first frame (flash-free) instead of showing placeholder defaults while a
     * network round trip completes. Returns null on a cold start (no cache yet)
     * or if the stored blob is unparseable/malformed. Cleared on logout via
     * TokenService.clear(). Non-secret data only — no auth material here.
     */
    getCachedNotificationPreferences(): NotificationPreferences | null {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        try {
            const raw = localStorage.getItem(NOTIF_PREFS_CACHE_KEY);
            if (!raw) return null;
            const p = JSON.parse(raw) as NotificationPreferences;
            // Minimal shape guard: reject stale/garbage blobs from older builds.
            if (typeof p?.email_enabled !== 'boolean' || typeof p?.timezone !== 'string') return null;
            return p;
        } catch {
            return null;
        }
    }

    private cacheNotificationPreferences(prefs: NotificationPreferences): void {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            localStorage.setItem(NOTIF_PREFS_CACHE_KEY, JSON.stringify(prefs));
        } catch {
            // Quota / private-mode failures are non-fatal: the page still works
            // from the network, it just won't get the flash-free warm paint.
        }
    }

    getNotificationPreferences(): Observable<NotificationPreferences> {
        return this.http.get<NotificationPreferences>(`${this.apiUrl}/notifications/preferences`)
            .pipe(tap(prefs => this.cacheNotificationPreferences(prefs)));
    }

    updateNotificationPreferences(changes: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
        return this.http.put<NotificationPreferences>(`${this.apiUrl}/notifications/preferences`, changes)
            .pipe(tap(prefs => this.cacheNotificationPreferences(prefs)));
    }

    // ── Custom categories (S13 PRO-4) ──────────────────────────────────────
    getCustomCategories(): Observable<CustomCategory[]> {
        return this.http.get<CustomCategory[]>(`${this.apiUrl}/categories/custom`);
    }

    createCustomCategory(data: CustomCategoryCreate): Observable<CustomCategory> {
        return this.http.post<CustomCategory>(`${this.apiUrl}/categories/custom`, data);
    }

    updateCustomCategory(id: number, changes: Partial<CustomCategoryCreate>): Observable<CustomCategory> {
        return this.http.patch<CustomCategory>(`${this.apiUrl}/categories/custom/${id}`, changes);
    }

    deleteCustomCategory(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/categories/custom/${id}`);
    }

    // ── Custom alert rules (S13 PRO-1) ─────────────────────────────────────
    getAlertRules(): Observable<AlertRule[]> {
        return this.http.get<AlertRule[]>(`${this.apiUrl}/alerts/rules`);
    }

    createAlertRule(data: AlertRuleCreate): Observable<AlertRule> {
        return this.http.post<AlertRule>(`${this.apiUrl}/alerts/rules`, data);
    }

    updateAlertRule(id: number, changes: Partial<AlertRule>): Observable<AlertRule> {
        return this.http.patch<AlertRule>(`${this.apiUrl}/alerts/rules/${id}`, changes);
    }

    deleteAlertRule(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/alerts/rules/${id}`);
    }

    getVapidPublicKey(): Observable<{ public_key: string }> {
        return this.http.get<{ public_key: string }>(`${this.apiUrl}/notifications/vapid-public-key`);
    }

    registerPushSubscription(subscription: object, userAgent: string): Observable<PushDevice> {
        return this.http.post<PushDevice>(`${this.apiUrl}/notifications/push-subscription`,
            { ...subscription, user_agent: userAgent });
    }

    listPushDevices(): Observable<PushDevice[]> {
        return this.http.get<PushDevice[]>(`${this.apiUrl}/notifications/push-subscriptions`);
    }

    removePushSubscription(endpoint: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/notifications/push-subscription/delete`, { endpoint });
    }

    // ── Support contact (P1-5) ─────────────────────────────────────────────
    /** Settings -> Aide contact form. Lives here because every HTTP call goes
     *  through ApiService; help.ts used to inject HttpClient directly, which
     *  bypassed the interceptors (auth header, refresh retry, share
     *  read-only block). */
    sendContactMessage(payload: ContactMessage): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/contact`, payload);
    }

    // ── Notification center / inbox (P1-1) ─────────────────────────────────
    /** The stored history behind every push/email, so a dismissed notification
     *  is never lost. `text` arrives already resolved to the user's language;
     *  `unread_count` spans the WHOLE inbox (it drives the topbar badge, not
     *  just this page). */
    getInbox(limit = 50, offset = 0): Observable<InboxResponse> {
        const params = new HttpParams()
            .set('limit', limit.toString())
            .set('offset', offset.toString());
        return this.http.get<InboxResponse>(`${this.apiUrl}/notifications/inbox`, { params });
    }

    /** Mark specific entries read, or the whole inbox with `{ all: true }`. */
    markInboxRead(payload: { ids?: number[]; all?: boolean }): Observable<{ updated: number }> {
        return this.http.post<{ updated: number }>(`${this.apiUrl}/notifications/inbox/read`, payload);
    }

    // ========== BILLING / SUBSCRIPTION (S11) ==========
    /** Public pricing ladder (server-authoritative; the FE no longer keeps its
     *  own copy of the grid, the two must never drift). */
    getPlans(): Observable<PlansResponse> {
        return this.http.get<PlansResponse>(`${this.apiUrl}/billing/plans`);
    }

    /** Current entitlement + paid-subscription row for the Abonnement page. */
    getSubscription(): Observable<SubscriptionStatus> {
        return this.http.get<SubscriptionStatus>(`${this.apiUrl}/billing/subscription`);
    }

    /** AI message quota for the usage meter. */
    getUsage(): Observable<UsageStatus> {
        return this.http.get<UsageStatus>(`${this.apiUrl}/billing/usage`);
    }

    /** The owner's payment history (newest first). Empty until a payment exists. */
    getPayments(): Observable<PaymentHistoryItem[]> {
        return this.http.get<PaymentHistoryItem[]>(`${this.apiUrl}/billing/payments`);
    }

    /** Start a hosted checkout for a duration Pass. Access is granted ONLY by the
     *  signed server webhook, never by this call — it just returns the hosted URL
     *  to redirect to. 503 when no PSP is configured yet (beta). */
    createCheckout(req: CheckoutRequest): Observable<CheckoutResponse> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<CheckoutResponse>(`${this.apiUrl}/billing/checkout`, req);
    }

    /** Cancel = keep access until period end, stop renewing (never deletes data). */
    cancelSubscription(): Observable<SubscriptionStatus> {
        if (this.share.active()) return this.readonlyBlock;
        return this.http.post<SubscriptionStatus>(`${this.apiUrl}/billing/cancel`, {});
    }
}

