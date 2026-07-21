import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService, TontineSchedule } from '../../../core/services/api.service';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Tontine cycle tracking: renders the derived turn/payout schedule for a
 * tontine asset, lets the user mark each contribution paid/unpaid, highlights
 * their payout turn, and surfaces the next contribution due + next payout.
 */
@Component({
    selector: 'app-tontine-cycles',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="detail-surface">
            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('tontine.scheduleTitle') }}</h3>
                @if (schedule(); as s) {
                    <span class="text-xs font-semibold text-surface-500 dark:text-surface-400">
                        {{ s.contributions_made }}/{{ s.contributions_total }} {{ i18n.t('tontine.contributions') }}
                    </span>
                }
            </div>

            @if (loading()) {
                <div class="px-5 py-8 flex justify-center">
                    <i class="pi pi-spin pi-spinner text-surface-400 text-xl"></i>
                </div>
            } @else if (error()) {
                <div class="px-5 py-6 text-center">
                    <p class="text-sm text-surface-500 dark:text-surface-400 mb-3">{{ i18n.t('tontine.loadError') }}</p>
                    <button class="text-brand-700 dark:text-brand-300 text-sm font-semibold" (click)="load()">
                        <i class="pi pi-refresh text-xs mr-1"></i>{{ i18n.t('tontine.retry') }}
                    </button>
                </div>
            } @else if (schedule()) {
              @if (schedule(); as s) {
                @if (s.participants === 0) {
                    <div class="px-5 py-6 text-center text-sm text-surface-500 dark:text-surface-400">
                        {{ i18n.t('tontine.incomplete') }}
                    </div>
                } @else {
                    <!-- Summary strip -->
                    <div class="px-5 py-4 grid grid-cols-2 gap-3 border-b border-surface-100 dark:border-surface-800">
                        <div>
                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ i18n.t('tontine.pot') }}</p>
                            <p class="text-sm font-bold text-surface-900 dark:text-surface-0">{{ money(s.pot_size) }}</p>
                        </div>
                        <div>
                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ i18n.t('tontine.contributed') }}</p>
                            <p class="text-sm font-bold text-surface-900 dark:text-surface-0">{{ money(s.total_contributed) }}</p>
                        </div>
                    </div>

                    <!-- Progress bar -->
                    <div class="px-5 pt-4">
                        <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div class="h-full bg-brand-700 dark:bg-brand-300 rounded-full transition-all duration-500"
                                 [style.width]="progressPct() + '%'"></div>
                        </div>
                    </div>

                    <!-- Reminder banner -->
                    @if (!s.is_complete && (s.next_due_date || s.payout_date)) {
                        <div class="mx-5 mt-4 rounded-xl bg-ochre-50 dark:bg-ochre-900/15 border border-ochre-100 dark:border-ochre-900/30 px-4 py-3 flex flex-col gap-1.5">
                            @if (s.next_due_date) {
                                <div class="flex items-center gap-2 text-xs">
                                    <i class="pi pi-bell text-ochre-600 dark:text-ochre-400"></i>
                                    <span class="text-surface-600 dark:text-surface-300">{{ i18n.t('tontine.nextDue') }}</span>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0 ml-auto">{{ fmtDate(s.next_due_date) }}</span>
                                </div>
                            }
                            @if (s.payout_date && !s.payout_collected) {
                                <div class="flex items-center gap-2 text-xs">
                                    <i class="pi pi-gift text-brand-700 dark:text-ochre-400"></i>
                                    <span class="text-surface-600 dark:text-surface-300">{{ i18n.t('tontine.yourPayout') }}</span>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0 ml-auto">{{ fmtDate(s.payout_date) }}</span>
                                </div>
                            }
                        </div>
                    } @else if (s.is_complete) {
                        <div class="mx-5 mt-4 rounded-xl bg-positive-50 dark:bg-positive-900/15 border border-positive-100 dark:border-positive-900/30 px-4 py-3 flex items-center gap-2 text-xs">
                            <i class="pi pi-check-circle text-positive"></i>
                            <span class="font-semibold text-positive">{{ i18n.t('tontine.complete') }}</span>
                        </div>
                    }

                    <!-- Cycle timeline -->
                    <div class="px-5 py-4 space-y-1">
                        @for (c of s.cycles; track c.cycle_number) {
                            <div class="flex items-center gap-3 py-2.5 border-b border-surface-100 dark:border-surface-800 last:border-b-0"
                                 [class.opacity-60]="c.paid">
                                <!-- Cycle number / payout marker -->
                                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                                     [ngClass]="c.is_payout
                                         ? 'bg-ochre-500 text-warm-900'
                                         : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'">
                                    @if (c.is_payout) { <i class="pi pi-gift text-sm"></i> } @else { {{ c.cycle_number }} }
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 truncate">
                                        {{ fmtDate(c.due_date) }}
                                        @if (c.is_payout) { <span class="text-[10px] font-bold text-ochre-600 dark:text-ochre-400 ml-1 uppercase">{{ i18n.t('tontine.payout') }}</span> }
                                    </p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400">{{ money(c.amount) }}</p>
                                </div>
                                <!-- Paid toggle -->
                                <button class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                                        [ngClass]="c.paid
                                            ? 'bg-positive text-white'
                                            : 'bg-surface-100 dark:bg-surface-800 text-surface-400 hover:text-brand-700 dark:hover:text-brand-300'"
                                        [disabled]="saving() === c.cycle_number"
                                        [attr.aria-label]="c.paid ? i18n.t('tontine.markUnpaid') : i18n.t('tontine.markPaid')"
                                        (click)="toggle(c.cycle_number, !c.paid)">
                                    @if (saving() === c.cycle_number) {
                                        <i class="pi pi-spin pi-spinner text-sm"></i>
                                    } @else if (c.paid) {
                                        <i class="pi pi-check text-sm"></i>
                                    } @else {
                                        <i class="pi pi-circle text-sm"></i>
                                    }
                                </button>
                            </div>
                        }
                    </div>
                }
              }
            }
        </div>
    `
})
export class TontineCyclesComponent implements OnInit {
    @Input({ required: true }) assetId!: number;
    @Input() currency = 'EUR';

    private api = inject(ApiService);
    readonly i18n = inject(I18nService);

    loading = signal(true);
    error = signal(false);
    saving = signal<number | null>(null);
    schedule = signal<TontineSchedule | null>(null);

    progressPct = computed(() => {
        const s = this.schedule();
        if (!s || s.contributions_total === 0) return 0;
        return Math.round((s.contributions_made / s.contributions_total) * 100);
    });

    ngOnInit() { this.load(); }

    async load() {
        this.loading.set(true);
        this.error.set(false);
        try {
            this.schedule.set(await firstValueFrom(this.api.getTontineSchedule(this.assetId)));
        } catch {
            this.error.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    async toggle(cycleNumber: number, paid: boolean) {
        if (this.saving() != null) return;
        this.saving.set(cycleNumber);
        try {
            this.schedule.set(await firstValueFrom(
                this.api.setTontineCycle(this.assetId, cycleNumber, { paid })));
        } catch {
            this.error.set(true);
        } finally {
            this.saving.set(null);
        }
    }

    /** Native-currency amount: the backend returns values in the asset's own currency. */
    money(v: number): string {
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return `${v.toLocaleString(locale, { maximumFractionDigits: 0 })} ${this.currency}`;
    }

    fmtDate(iso: string): string {
        if (!iso) return ', ';
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    }
}
