import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { ApiService, WeeklyReportBundle } from '../../core/services/api.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent } from '../../core/ui';

type PageState = 'loading' | 'ready' | 'upsell' | 'error';

const MASK = '•••••';

/**
 * Bilan hebdomadaire (P2-4): the in-app view the Monday push and the inbox
 * deep-link to, rendering the same bundle as the recap email.
 *
 * Every money value arrives PRE-FORMATTED in the user's display currency, so
 * this page does zero money math; that also means CurrencyService's privacy
 * mask never sees these strings, so the page masks them itself (rule 5).
 *
 * The endpoint is Pro-gated. A free user gets 403 PLAN_REQUIRED, which is an
 * upsell here, not an error: the recap is the Pro promise, and "try again"
 * would just fail again.
 */
@Component({
    standalone: true,
    selector: 'app-weekly-report',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, PageHeaderComponent, LoadErrorComponent],
    template: `
        <app-page-header icon="pi-chart-bar" [title]="t('weeklyReport.title')" [subtitle]="report()?.meta?.period_label || t('weeklyReport.subtitle')" />

        @switch (state()) {
            @case ('loading') {
                <div class="grid gap-4 lg:grid-cols-2 max-w-5xl" aria-hidden="true">
                    <div class="h-44 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse"></div>
                    <div class="h-44 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse"></div>
                </div>
            }
            @case ('error') {
                <app-load-error (retry)="load()" />
            }
            @case ('upsell') {
                <!-- The Pro gate: aspirational, never an error card. -->
                <div class="max-w-xl rounded-2xl border border-ochre-200 dark:border-ochre-900/40 bg-ochre-50 dark:bg-ochre-900/15 p-6 sm:p-8 text-center" data-testid="wr-upsell">
                    <span class="mx-auto w-12 h-12 rounded-2xl grid place-items-center bg-ochre-500 text-warm-900 mb-4">
                        <i class="pi pi-crown text-xl" aria-hidden="true"></i>
                    </span>
                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('weeklyReport.proTitle') }}</h2>
                    <p class="text-sm leading-relaxed text-surface-600 dark:text-surface-300 mt-2 mb-5">{{ t('weeklyReport.proBody') }}</p>
                    <a [routerLink]="nav.link('pages', 'plans')" [queryParams]="{ tier: 'pro' }"
                       class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ochre-500 hover:bg-ochre-400 text-warm-900 text-sm font-bold omaad-press transition-colors">
                        <i class="pi pi-crown text-xs" aria-hidden="true"></i>{{ t('weeklyReport.proCta') }}
                    </a>
                </div>
            }
            @case ('ready') {
                @if (!report()!.has_content) {
                    <!-- Empty account: the teaching variant, as the email never arrives blank. -->
                    <div class="max-w-xl rounded-2xl bg-surface-100 dark:bg-surface-800 px-6 py-10 text-center" data-testid="wr-empty">
                        <i class="pi pi-chart-bar text-3xl text-ochre-600 dark:text-ochre-300" aria-hidden="true"></i>
                        <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 mt-3 mb-1.5">{{ t('weeklyReport.emptyTitle') }}</h2>
                        <p class="text-sm leading-relaxed text-surface-500 dark:text-surface-400 mb-4">{{ t('weeklyReport.emptyBody') }}</p>
                        <a [routerLink]="nav.link('pages', 'patrimoine', 'add-asset')"
                           class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-700 hover:bg-brand-800 text-white dark:bg-ochre-400 dark:hover:bg-ochre-300 dark:text-warm-900 text-sm font-semibold omaad-press transition-colors">
                            <i class="pi pi-plus text-xs" aria-hidden="true"></i>{{ t('weeklyReport.addAsset') }}
                        </a>
                    </div>
                } @else {
                    @let r = report()!;
                    <div class="grid gap-4 lg:gap-6 lg:grid-cols-2 max-w-5xl" data-testid="wr-body">
                        <div class="flex flex-col gap-4 lg:gap-6">
                            <!-- Hero: the week's net savings, the number the recap exists for -->
                            <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 p-5">
                                <p class="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 m-0">{{ t('weeklyReport.netSavings') }}</p>
                                <p class="text-3xl font-extrabold tabular-nums text-surface-900 dark:text-surface-0 mt-1.5 m-0" data-testid="wr-net">{{ m(r.summary.net_savings) }}</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400 mt-1 m-0">{{ t('weeklyReport.savingsRate', { pct: pct(r.summary.savings_rate) }) }}</p>
                                <div class="grid grid-cols-2 gap-2.5 mt-4">
                                    <div class="rounded-xl bg-surface-50 dark:bg-surface-800/60 px-3 py-2.5">
                                        <p class="text-[11px] text-surface-400 dark:text-surface-500 m-0">{{ t('weeklyReport.income') }}</p>
                                        <p class="text-sm font-bold tabular-nums text-positive dark:text-positive-400 m-0 mt-0.5">{{ m(r.summary.income) }}</p>
                                    </div>
                                    <div class="rounded-xl bg-surface-50 dark:bg-surface-800/60 px-3 py-2.5">
                                        <p class="text-[11px] text-surface-400 dark:text-surface-500 m-0">{{ t('weeklyReport.expenses') }}</p>
                                        <p class="text-sm font-bold tabular-nums text-negative dark:text-negative-400 m-0 mt-0.5">{{ m(r.summary.expenses) }}</p>
                                    </div>
                                </div>
                            </section>

                            <!-- Standing picture: net worth + FIRE progress as of now -->
                            <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 p-5">
                                <p class="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 m-0">{{ t('weeklyReport.netWorth') }}</p>
                                <p class="text-2xl font-extrabold tabular-nums text-surface-900 dark:text-surface-0 mt-1.5 m-0">{{ m(r.summary.net_worth) }}</p>
                                @if (r.summary.fire_progress !== null) {
                                    <div class="h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden mt-3" role="progressbar"
                                         [attr.aria-valuenow]="clamp(r.summary.fire_progress)" aria-valuemin="0" aria-valuemax="100">
                                        <div class="h-full rounded-full bg-ochre-500 dark:bg-ochre-400" [style.width.%]="clamp(r.summary.fire_progress)"></div>
                                    </div>
                                    <p class="text-xs text-surface-500 dark:text-surface-400 mt-1.5 m-0">{{ t('weeklyReport.fireProgress', { pct: pct(r.summary.fire_progress) }) }}</p>
                                }
                            </section>
                        </div>

                        <div class="flex flex-col gap-4 lg:gap-6">
                            @if (r.top_expenses.length) {
                                <section>
                                    <h2 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0 mb-2.5">{{ t('weeklyReport.topExpenses') }}</h2>
                                    <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-4 py-1.5">
                                        @for (e of r.top_expenses; track $index) {
                                            <div class="flex items-center justify-between gap-3 py-2.5"
                                                 [class]="$index > 0 ? 'border-t border-surface-100 dark:border-surface-800' : ''">
                                                <span class="text-sm text-surface-800 dark:text-surface-200 truncate">{{ categoryLabel(e.category) }}</span>
                                                <span class="text-sm font-semibold tabular-nums text-surface-900 dark:text-surface-0 shrink-0">{{ m(e.amount) }}</span>
                                            </div>
                                        }
                                    </div>
                                </section>
                            }
                            @if (r.goals.length) {
                                <section>
                                    <h2 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0 mb-2.5">{{ t('weeklyReport.goals') }}</h2>
                                    <div class="flex flex-col gap-2">
                                        @for (g of r.goals; track g.name) {
                                            <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-4 py-3">
                                                <div class="flex items-center justify-between gap-3">
                                                    <span class="text-sm font-semibold text-surface-900 dark:text-surface-0 truncate">{{ g.name }}</span>
                                                    <span class="text-xs text-surface-500 dark:text-surface-400 shrink-0">{{ pct(g.pct) }}</span>
                                                </div>
                                                <div class="h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden mt-2" role="progressbar"
                                                     [attr.aria-valuenow]="clamp(g.pct)" aria-valuemin="0" aria-valuemax="100">
                                                    <div class="h-full rounded-full bg-ochre-500 dark:bg-ochre-400" [style.width.%]="clamp(g.pct)"></div>
                                                </div>
                                                <p class="text-xs tabular-nums text-surface-400 dark:text-surface-500 mt-1.5 m-0">{{ m(g.current) }} / {{ m(g.target) }}</p>
                                            </div>
                                        }
                                    </div>
                                </section>
                            }
                        </div>
                    </div>
                    <p class="mt-4 px-1 text-xs text-surface-400 dark:text-surface-500">{{ t('weeklyReport.footnote') }}</p>
                }
            }
        }
    `,
})
export class WeeklyReportPage implements OnInit {
    readonly i18n = inject(I18nService);
    readonly nav = inject(NavService);
    private api = inject(ApiService);
    private privacy = inject(PrivacyService);

    readonly report = signal<WeeklyReportBundle | null>(null);
    readonly state = signal<PageState>('loading');
    private readonly hidden = computed(() => this.privacy.hidden());

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    /** A pre-formatted money string, masked under privacy mode (rule 5). */
    m(v: string | null | undefined): string { return this.hidden() ? MASK : (v ?? '—'); }

    pct(v: number | null | undefined): string {
        const n = new Intl.NumberFormat(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(v ?? 0);
        return this.i18n.lang() === 'fr' ? `${n} %` : `${n}%`;
    }
    clamp(v: number | null | undefined): number { return Math.min(100, Math.max(0, v ?? 0)); }

    /** The backend labels built-in categories in FR only and leaves the rest
     *  as its enum code; the web dictionary knows both languages, so re-label
     *  a code when it recognizes one and keep custom labels verbatim. */
    categoryLabel(raw: string): string {
        const code = raw.toLowerCase();
        const label = this.i18n.categoryLabel(code);
        return label && label !== code ? label : raw;
    }

    ngOnInit(): void { this.load(); }

    load(): void {
        this.state.set('loading');
        this.api.getWeeklyReport().subscribe({
            next: bundle => { this.report.set(bundle); this.state.set('ready'); },
            error: (err: unknown) => {
                const e = err as HttpErrorResponse;
                const code = e?.error?.detail?.code ?? e?.error?.code;
                this.state.set(e?.status === 403 && code === 'PLAN_REQUIRED' ? 'upsell' : 'error');
            },
        });
    }
}
