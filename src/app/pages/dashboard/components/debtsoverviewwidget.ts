import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { DebtsService, DebtRecord } from '../../service/debts.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';

interface DebtDisplay {
    id: string;
    label: string;
    paid: number;
    total: number;
    percent: number;
    icon: string;
    bgClass: string;
    iconClass: string;
    progressClass: string;
    textClass: string;
}

@Component({
    standalone: true,
    selector: 'app-debts-overview',
    imports: [CommonModule, RouterModule, AppAmountComponent, LoadErrorComponent],
    template: `
        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 h-full">
            <div class="relative flex justify-between items-center mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('dashboard.debtsOverview') }}</div>
                <a [routerLink]="link('pages', 'debts')" class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium text-sm transition-colors">
                    {{ t('common.viewMore') }} <i class="pi pi-chevron-right text-xs ml-1"></i>
                </a>
            </div>
            
            @if (loading()) {
                <div class="relative space-y-5">
                    @for (i of [1,2,3]; track i) {
                        <div class="animate-pulse">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700"></div>
                                    <div>
                                        <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-1"></div>
                                        <div class="h-3 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                                    </div>
                                </div>
                                <div class="h-6 bg-surface-200 dark:bg-surface-700 rounded w-12"></div>
                            </div>
                            <div class="h-2 bg-surface-200 dark:bg-surface-700 rounded-full"></div>
                        </div>
                    }
                </div>
            } @else if (loadError()) {
                <!-- NEVER show "no debts 🎉" on a failed load — that's a false financial state -->
                <app-load-error (retry)="loadDebts()" />
            } @else if (debts().length === 0) {
                <div class="relative flex flex-col items-center justify-center py-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center mb-4">
                        <i class="pi pi-check-circle text-2xl text-positive"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 mb-2">{{ t('dashboard.noDebts') }}</p>
                    <p class="text-positive text-sm">{{ t('dashboard.noDebtsCongrats') }}</p>
                </div>
            } @else {
                <ul class="relative list-none p-0 m-0 space-y-4">
                    @for (debt of debts(); track debt.id) {
                        <li class="flex items-center gap-4 p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                            <!-- Circular ring -->
                            <div class="relative w-12 h-12 shrink-0">
                                <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                                    <circle cx="18" cy="18" r="15.5" fill="none"
                                            stroke="currentColor" stroke-width="3"
                                            class="text-surface-200 dark:text-surface-700" />
                                    <circle cx="18" cy="18" r="15.5" fill="none"
                                            stroke-width="3" stroke-linecap="round"
                                            class="text-brand-700 dark:text-brand-300"
                                            [attr.stroke-dasharray]="ringDash(debt.percent)"
                                            stroke="currentColor" />
                                </svg>
                                <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-surface-700 dark:text-surface-200">
                                    {{ debt.percent }}%
                                </span>
                            </div>
                            <!-- Details -->
                            <div class="flex-1 min-w-0">
                                <span class="text-surface-900 dark:text-surface-0 font-medium text-sm block truncate">{{ debt.label }}</span>
                                <span class="text-surface-500 dark:text-surface-400 text-xs"><app-amount [value]="debt.paid" /> / <app-amount [value]="debt.total" /></span>
                            </div>
                            <!-- Icon -->
                            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" [ngClass]="debt.bgClass">
                                <i [class]="debt.icon" [ngClass]="debt.iconClass" class="text-sm"></i>
                            </div>
                        </li>
                    }
                </ul>
            }
        </div>
    `
})
export class DebtsOverview implements OnInit, OnDestroy {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private nav = inject(NavService);
    private debtsService = inject(DebtsService);
    private stateService = inject(AssetsStateService);
    
    private subscription?: Subscription;
    loading = signal(true);
    loadError = signal(false);
    debts = signal<DebtDisplay[]>([]);

    async ngOnInit() {
        await this.loadDebts();
        
        // Subscribe to debt updates to refresh the list
        this.subscription = this.stateService.debtsUpdated$.subscribe(() => {
            this.loadDebts();
        });
    }
    
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    async loadDebts() {
        this.loading.set(true);
        try {
            const records = await this.debtsService.getRecords();
            this.loadError.set(false);
            
            if (records.length > 0) {
                // All debts share the same neutral chrome — only the icon glyph
                // differentiates the category. Progress bar uses the brand color.
                const sharedChrome = {
                    bgClass: 'bg-brand-100 dark:bg-brand-700/20',
                    iconClass: 'text-brand-700 dark:text-ochre-400',
                    progressClass: 'bg-brand-700 dark:bg-brand-300',
                    textClass: 'text-brand-700 dark:text-brand-300',
                };
                const colorConfigs = [
                    { icon: 'pi pi-home',        ...sharedChrome },
                    { icon: 'pi pi-users',       ...sharedChrome },
                    { icon: 'pi pi-car',         ...sharedChrome },
                    { icon: 'pi pi-credit-card', ...sharedChrome },
                    { icon: 'pi pi-book',        ...sharedChrome }
                ];

                // Filter only active debts and sort by remaining amount
                const activeDebts = records
                    .filter(d => d.type === 'Debt' && d.paid < d.total)
                    .sort((a, b) => (b.total - b.paid) - (a.total - a.paid))
                    .slice(0, 5);

                const mapped = activeDebts.map((d, index) => ({
                    id: d.id || index.toString(),
                    label: d.name,
                    paid: d.paid,
                    total: d.total,
                    percent: Math.min(100, Math.max(0, Math.round((d.paid / (d.total || 1)) * 100))),
                    ...colorConfigs[index % colorConfigs.length]
                }));
                
                this.debts.set(mapped);
            }
        } catch (error) {
            console.error('Error loading debts:', error);
            // Explicit error+retry instead of the fake "no debts 🎉" state.
            if (this.debts().length === 0) this.loadError.set(true);
        } finally {
            this.loading.set(false);
        }
    }
    
    ringDash(percent: number): string {
        const circumference = 2 * Math.PI * 15.5;
        const filled = (Math.min(100, percent) / 100) * circumference;
        return `${filled} ${circumference}`;
    }

    t(key: string): string { 
        return this.i18n.t(key); 
    }

    link(...segments: string[]): any[] {
        return this.nav.link(...segments);
    }
}
