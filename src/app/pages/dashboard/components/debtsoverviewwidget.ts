import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { DebtsService, DebtRecord } from '../../service/debts.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

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
    imports: [CommonModule, RouterModule, AppAmountComponent],
    template: `
        <div class="card h-full">
            <div class="flex justify-between items-center mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('dashboard.debtsOverview') }}</div>
                <a [routerLink]="link('pages', 'debts')" class="text-indigo-500 hover:text-indigo-400 font-medium text-sm transition-colors">
                    {{ t('common.viewMore') }} <i class="pi pi-chevron-right text-xs ml-1"></i>
                </a>
            </div>
            
            @if (loading()) {
                <div class="space-y-5">
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
            } @else if (debts().length === 0) {
                <div class="flex flex-col items-center justify-center py-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <i class="pi pi-check-circle text-2xl text-emerald-500"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 mb-2">{{ t('dashboard.noDebts') }}</p>
                    <p class="text-emerald-500 text-sm">{{ t('dashboard.noDebtsCongrats') }}</p>
                </div>
            } @else {
                <ul class="list-none p-0 m-0 space-y-5">
                    @for (debt of debts(); track debt.id) {
                        <li class="group">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl flex items-center justify-center" [ngClass]="debt.bgClass">
                                        <i [class]="debt.icon" [ngClass]="debt.iconClass"></i>
                                    </div>
                                    <div>
                                        <span class="text-surface-900 dark:text-surface-0 font-medium block">{{ debt.label }}</span>
                                        <span class="text-surface-500 dark:text-surface-400 text-sm"><app-amount [value]="debt.paid" /> / <app-amount [value]="debt.total" /></span>
                                    </div>
                                </div>
                                <span class="font-bold text-lg" [ngClass]="debt.textClass">{{ debt.percent }}%</span>
                            </div>
                            <div class="relative h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-500" 
                                     [ngClass]="debt.progressClass" 
                                     [ngStyle]="{ width: debt.percent + '%' }">
                                </div>
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
    private debtsService = inject(DebtsService);
    private stateService = inject(AssetsStateService);
    
    private subscription?: Subscription;
    loading = signal(true);
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

    private async loadDebts() {
        this.loading.set(true);
        try {
            const records = await this.debtsService.getRecords();
            
            if (records.length > 0) {
                const colorConfigs = [
                    { icon: 'pi pi-home', bgClass: 'bg-indigo-500/10', iconClass: 'text-indigo-500', progressClass: 'bg-gradient-to-r from-indigo-600 to-indigo-400', textClass: 'text-indigo-500' },
                    { icon: 'pi pi-users', bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500', progressClass: 'bg-gradient-to-r from-emerald-600 to-emerald-400', textClass: 'text-emerald-500' },
                    { icon: 'pi pi-car', bgClass: 'bg-cyan-500/10', iconClass: 'text-cyan-500', progressClass: 'bg-gradient-to-r from-cyan-600 to-cyan-400', textClass: 'text-cyan-500' },
                    { icon: 'pi pi-credit-card', bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500', progressClass: 'bg-gradient-to-r from-amber-600 to-amber-400', textClass: 'text-amber-500' },
                    { icon: 'pi pi-book', bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500', progressClass: 'bg-gradient-to-r from-violet-600 to-violet-400', textClass: 'text-violet-500' }
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
            this.debts.set([]);
        } finally {
            this.loading.set(false);
        }
    }
    
    t(key: string): string { 
        return this.i18n.t(key); 
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
