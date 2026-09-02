import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { PrivacyService } from '../../../core/services/privacy.service';
import { CustomCategoryService } from '../../../core/services/custom-category.service';
import { AlertRule, AlertRuleType, ApiService } from '../../../core/services/api.service';
import { EXPENSE_CATEGORIES } from '../../service/transactions.service';
import { AlertsDataService } from './alerts-data.service';
import { FeedbackService } from '../../../core/ui/feedback.service';

type RuleForm = {
    rule_type: AlertRuleType;
    category: string;
    account_id: number | null;
    goal_id: number | null;
    threshold: number | null;
    days_before: number | null;
};

/**
 * Settings → Alerts (S13 PRO-1). Custom alert rules delivered over the existing
 * push/email pipeline (no SMS: we don't collect phone numbers). Built to the
 * settings-redesign bar (categories/subscription pages): a rule-type segmented
 * control that swaps in the right target picker, quiet inputs, ochre selection,
 * gradient CTA, a grouped list with tinted type tiles, and a teaching empty
 * state. Retiring a rule is a soft delete on the backend.
 */
@Component({
    selector: 'app-settings-alerts',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="max-w-2xl mx-auto pb-12">
            <h2 class="hidden lg:block text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.alerts.title') }}</h2>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">{{ t('settings.alerts.subtitle') }}</p>

            <!-- ═══════ COMPOSER (needs no server data: paints immediately) ═══════ -->
            <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 mb-5">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">
                        {{ editingId() ? t('settings.alerts.editTitle') : t('settings.alerts.addTitle') }}
                    </h3>
                    @if (editingId()) {
                        <button type="button" (click)="resetForm()"
                                class="omaad-press text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200">
                            {{ t('common.cancel') }}
                        </button>
                    }
                </div>

                <!-- Rule type segmented control (locked while editing) -->
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.alerts.type') }}</label>
                <div class="grid grid-cols-3 gap-2 mb-6" role="radiogroup" [class.opacity-60]="editingId() !== null">
                    @for (rt of RULE_TYPES; track rt.key) {
                        <button type="button" role="radio" [attr.aria-checked]="form.rule_type === rt.key"
                                (click)="setType(rt.key)" [disabled]="editingId() !== null"
                                class="omaad-press flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all"
                                [ngClass]="form.rule_type === rt.key
                                    ? 'border-ochre-500 ring-2 ring-ochre-500/20 bg-ochre-500/[0.06]'
                                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'">
                            <i [class]="rt.icon" class="text-lg" [style.color]="form.rule_type === rt.key ? '#C77B3C' : ''"
                               [ngClass]="form.rule_type === rt.key ? '' : 'text-surface-500 dark:text-surface-400'"></i>
                            <span class="text-[12px] font-medium leading-tight"
                                  [ngClass]="form.rule_type === rt.key ? 'text-surface-900 dark:text-surface-0' : 'text-surface-500 dark:text-surface-400'">
                                {{ t('settings.alerts.type_' + rt.key) }}
                            </span>
                        </button>
                    }
                </div>

                <!-- Per-type target + params -->
                @switch (form.rule_type) {
                    @case ('category_spend') {
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.alerts.category') }}</label>
                                <select [(ngModel)]="form.category" [class]="selectClass">
                                    @for (c of categoryOptions(); track c.value) {
                                        <option [value]="c.value">{{ c.label }}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.alerts.monthlyThreshold') }}</label>
                                <div class="flex items-baseline gap-2 border-b border-surface-300 dark:border-surface-600 focus-within:border-ochre-500">
                                    <input type="number" min="1" [(ngModel)]="form.threshold" [placeholder]="'0'" [class]="numClass" />
                                    <span class="text-sm text-surface-400 dark:text-surface-500 shrink-0">{{ currencyCode() }}</span>
                                </div>
                            </div>
                        </div>
                    }
                    @case ('balance_floor') {
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.alerts.account') }}</label>
                                <select [(ngModel)]="form.account_id" [class]="selectClass">
                                    <option [ngValue]="null" disabled>{{ t('settings.alerts.pickAccount') }}</option>
                                    @for (a of accounts(); track a.id) {
                                        <option [ngValue]="a.id">{{ a.name }}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.alerts.floor') }}</label>
                                <div class="flex items-baseline gap-2 border-b border-surface-300 dark:border-surface-600 focus-within:border-ochre-500">
                                    <input type="number" min="0" [(ngModel)]="form.threshold" [placeholder]="'0'" [class]="numClass" />
                                    <span class="text-sm text-surface-400 dark:text-surface-500 shrink-0">{{ currencyCode() }}</span>
                                </div>
                            </div>
                        </div>
                    }
                    @case ('goal_deadline') {
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.alerts.goal') }}</label>
                                <select [(ngModel)]="form.goal_id" [class]="selectClass">
                                    <option [ngValue]="null" disabled>{{ t('settings.alerts.pickGoal') }}</option>
                                    @for (g of goals(); track g.id) {
                                        <option [ngValue]="g.id">{{ g.name }}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.alerts.daysBefore') }}</label>
                                <div class="flex items-baseline gap-2 border-b border-surface-300 dark:border-surface-600 focus-within:border-ochre-500">
                                    <input type="number" min="1" max="365" [(ngModel)]="form.days_before" [placeholder]="'30'" [class]="numClass" />
                                    <span class="text-sm text-surface-400 dark:text-surface-500 shrink-0">{{ t('settings.alerts.days') }}</span>
                                </div>
                            </div>
                        </div>
                    }
                }

                <button type="button" (click)="save()" [disabled]="!valid() || busy()"
                        class="omaad-press inline-flex items-center gap-2 rounded-full py-2.5 px-6 mt-7 font-bold text-warm-900 bg-gradient-to-r from-ochre-400 to-ochre-500 shadow-sm disabled:opacity-50 transition-opacity">
                    <i class="pi shrink-0" [ngClass]="busy() ? 'pi-spin pi-spinner' : (editingId() ? 'pi-check' : 'pi-plus')" style="font-size: 13px" aria-hidden="true"></i>
                    {{ editingId() ? t('common.save') : t('settings.alerts.add') }}
                </button>
            </section>

            <!-- ═══════ LIST / EMPTY STATE ═══════ -->
            @if (rulesLoading()) {
                <div class="rounded-2xl h-32 bg-surface-100 dark:bg-surface-800/60 animate-pulse"></div>
            } @else if (!rules().length) {
                <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-ochre-500/10 flex items-center justify-center mx-auto mb-3">
                        <i class="pi pi-bell text-ochre-500 text-xl" aria-hidden="true"></i>
                    </div>
                    <p class="font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.alerts.emptyTitle') }}</p>
                    <p class="text-sm text-surface-500 dark:text-surface-400 max-w-[40ch] mx-auto">{{ t('settings.alerts.emptyBody') }}</p>
                </section>
            } @else {
                <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm px-5 md:px-6 py-2">
                    <div class="flex items-center justify-between pt-3.5 pb-1">
                        <h3 class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">{{ t('settings.alerts.yourRules') }}</h3>
                        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 tabular-nums">{{ rules().length }}/{{ MAX }}</span>
                    </div>
                    <div class="divide-y divide-surface-100 dark:divide-surface-800">
                        @for (r of rules(); track r.id) {
                            <div class="group flex items-center gap-3 py-3.5 -mx-2 px-2 rounded-xl transition-colors"
                                 [ngClass]="editingId() === r.id ? 'bg-ochre-500/[0.05]' : ''">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-ochre-500/[0.12]">
                                    <i [class]="iconFor(r.rule_type)" class="text-ochre-600 dark:text-ochre-300" aria-hidden="true"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-[15px] text-surface-900 dark:text-surface-0 truncate">{{ summaryFor(r) }}</p>
                                    <p class="text-[11px] text-surface-400 dark:text-surface-500">{{ t('settings.alerts.type_' + r.rule_type) }}</p>
                                </div>
                                <button type="button" (click)="edit(r)" [attr.aria-label]="t('common.edit')"
                                        class="omaad-press w-9 h-9 rounded-full flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                                    <i class="pi pi-pencil !text-[13px]" aria-hidden="true"></i>
                                </button>
                                <button type="button" (click)="confirmRemove(r)" [attr.aria-label]="t('common.delete')"
                                        class="omaad-press w-9 h-9 rounded-full flex items-center justify-center text-surface-400 hover:text-negative hover:bg-negative/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                                    <i class="pi pi-trash !text-[13px]" aria-hidden="true"></i>
                                </button>
                            </div>
                        }
                    </div>
                </section>
            }
        </div>
    `,
})
export class AlertsSettings implements OnInit {
    private i18n = inject(I18nService);
    private api = inject(ApiService);
    private cs = inject(CurrencyService);
    private privacy = inject(PrivacyService);
    private cats = inject(CustomCategoryService);
    private data = inject(AlertsDataService);
    private feedback = inject(FeedbackService);

    readonly MAX = 20;
    readonly RULE_TYPES: { key: AlertRuleType; icon: string }[] = [
        { key: 'category_spend', icon: 'pi pi-chart-pie' },
        { key: 'balance_floor', icon: 'pi pi-wallet' },
        { key: 'goal_deadline', icon: 'pi pi-flag' },
    ];
    readonly selectClass = 'w-full bg-transparent border-0 border-b border-surface-300 dark:border-surface-600 focus:border-ochre-500 focus:outline-none py-2 text-[15px] text-surface-900 dark:text-surface-0 rounded-none';
    readonly numClass = 'w-full bg-transparent border-0 focus:outline-none py-2 text-[15px] text-surface-900 dark:text-surface-0 tabular-nums placeholder:text-surface-400';

    // Cached, shared reads (P2-FE-1): instant on revisit, background revalidate.
    readonly rules = this.data.rules;
    readonly accounts = this.data.accounts;
    readonly goals = this.data.goals;
    readonly rulesLoading = this.data.rulesLoading;
    editingId = signal<number | null>(null);
    busy = signal(false);
    currencyCode = computed(() => this.cs.currencyCode());

    form: RuleForm = this._blank();

    /** Expense categories the user can target: built-ins + their custom ones. */
    categoryOptions = computed(() => {
        const builtins = EXPENSE_CATEGORIES.map(v => ({ value: v as string, label: this.cats.resolve(v).label }));
        const custom = this.cats.expense().map(c => ({ value: c.value, label: c.label }));
        return [...builtins, ...custom];
    });

    ngOnInit() {
        this.cats.load();
        this.data.ensureLoaded();
    }

    private _blank(): RuleForm {
        return { rule_type: 'category_spend', category: 'groceries', account_id: null, goal_id: null, threshold: null, days_before: 30 };
    }

    setType(t: AlertRuleType) {
        if (this.editingId() !== null) return;  // type is immutable while editing
        this.form.rule_type = t;
    }

    valid(): boolean {
        const f = this.form;
        if (f.rule_type === 'category_spend') return !!f.category && !!f.threshold && f.threshold > 0;
        if (f.rule_type === 'balance_floor') return f.account_id != null && f.threshold != null && f.threshold >= 0;
        return f.goal_id != null && !!f.days_before && f.days_before >= 1 && f.days_before <= 365;
    }

    resetForm() {
        this.editingId.set(null);
        this.form = this._blank();
    }

    edit(r: AlertRule) {
        this.editingId.set(r.id);
        this.form = {
            rule_type: r.rule_type,
            category: r.category || 'groceries',
            account_id: r.account_id,
            goal_id: r.goal_id,
            threshold: r.threshold,
            days_before: r.days_before ?? 30,
        };
    }

    save() {
        if (!this.valid() || this.busy()) return;
        this.busy.set(true);
        const f = this.form;
        const id = this.editingId();

        const done = (msg: string, rule: AlertRule) => {
            this.busy.set(false);
            this.feedback.success(msg);
            this.resetForm();
            this.data.upsertRule(rule);  // patch locally; no full-list refetch
        };
        const fail = (e: any) => {
            this.busy.set(false);
            const msg = e?.status === 409 ? this.t('settings.alerts.capReached', { n: this.MAX })
                : e?.status === 403 ? this.t('settings.alerts.proOnly')
                : this.t('settings.alerts.saveError');
            this.feedback.error(msg);
        };

        if (id !== null) {
            // Only tunable params change; type + target are immutable.
            const changes: Partial<AlertRule> = f.rule_type === 'goal_deadline'
                ? { days_before: f.days_before }
                : { threshold: f.threshold, threshold_currency: this.currencyCode() };
            this.api.updateAlertRule(id, changes).subscribe({ next: r => done(this.t('settings.alerts.updated'), r), error: fail });
        } else {
            const payload: any = { rule_type: f.rule_type };
            if (f.rule_type === 'category_spend') { payload.category = f.category; payload.threshold = f.threshold; payload.threshold_currency = this.currencyCode(); }
            else if (f.rule_type === 'balance_floor') { payload.account_id = f.account_id; payload.threshold = f.threshold; payload.threshold_currency = this.currencyCode(); }
            else { payload.goal_id = f.goal_id; payload.days_before = f.days_before; }
            this.api.createAlertRule(payload).subscribe({ next: r => done(this.t('settings.alerts.added'), r), error: fail });
        }
    }

    async confirmRemove(r: AlertRule) {
        const ok = await this.feedback.confirm({
            title: this.t('settings.alerts.deleteTitle'),
            message: this.t('settings.alerts.deleteBody'),
        });
        if (!ok) return;
        this.api.deleteAlertRule(r.id).subscribe({
            next: () => {
                if (this.editingId() === r.id) this.resetForm();
                this.data.removeRule(r.id);
                this.feedback.success(this.t('settings.alerts.deleted'));
            },
            error: () => this.feedback.error(this.t('settings.alerts.saveError')),
        });
    }

    iconFor(t: AlertRuleType): string {
        return this.RULE_TYPES.find(r => r.key === t)?.icon || 'pi pi-bell';
    }

    /** Human one-liner for the list, in the rule's stored currency. Thresholds
     *  mask under privacy mode: "alert me under 50 000" states the scale of the
     *  account it watches, which is what the eye toggle withholds (P0-3). */
    summaryFor(r: AlertRule): string {
        const amt = (v: number | null, cur: string | null) =>
            this.privacy.hidden()
                ? `••••• ${cur || ''}`.trim()
                : `${(v ?? 0).toLocaleString('fr-FR').replace(/ /g, ' ')} ${cur || ''}`.trim();
        if (r.rule_type === 'category_spend') {
            return this.t('settings.alerts.summarySpend', { cat: this.cats.resolve(r.category).label, amount: amt(r.threshold, r.threshold_currency) });
        }
        if (r.rule_type === 'balance_floor') {
            const name = this.accounts().find(a => a.id === r.account_id)?.name || '';
            return this.t('settings.alerts.summaryFloor', { account: name, amount: amt(r.threshold, r.threshold_currency) });
        }
        const gname = this.goals().find(g => g.id === r.goal_id)?.name || '';
        return this.t('settings.alerts.summaryDeadline', { goal: gname, days: r.days_before ?? 0 });
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
