import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SavingsService, SavingsGoalDisplay } from '../../service/savings.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { I18nService } from '../../../i18n/i18n.service';

interface GoalDisplay {
    label: string;
    current: number;
    target: number;
    percent: number;
    icon: string;
    bgClass: string;
    iconClass: string;
    progressClass: string;
    textColorClass: string;
}

@Component({
    standalone: true,
    selector: 'app-savings-progress',
    imports: [CommonModule, RouterModule, AppAmountComponent],
    template: `
        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 h-full">
            <div class="relative flex justify-between items-center mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ i18n.t('dashboard.savingsProgress') }}</div>
                <a [routerLink]="link('pages', 'goals')" class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium text-sm transition-colors">
                    {{ i18n.t('common.viewMore') }} <i class="pi pi-chevron-right text-xs ml-1"></i>
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
            } @else if (goals().length === 0) {
                <div class="relative flex flex-col items-center justify-center py-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                        <i class="pi pi-wallet text-2xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 mb-2">{{ i18n.t('dashboard.savingsNoGoal') }}</p>
                    <a [routerLink]="link('pages', 'goals')" class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 text-sm">
                        {{ i18n.t('dashboard.savingsCreateGoal') }} <i class="pi pi-arrow-right text-xs ml-1"></i>
                    </a>
                </div>
            } @else {
                <ul class="relative list-none p-0 m-0 space-y-4">
                    @for (g of goals(); track g.label) {
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
                                            [attr.stroke-dasharray]="ringDash(g.percent)"
                                            stroke="currentColor" />
                                </svg>
                                <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-surface-700 dark:text-surface-200">
                                    {{ g.percent }}%
                                </span>
                            </div>
                            <!-- Details -->
                            <div class="flex-1 min-w-0">
                                <span class="text-surface-900 dark:text-surface-0 font-medium text-sm block truncate">{{ g.label }}</span>
                                <span class="text-surface-500 dark:text-surface-400 text-xs"><app-amount [value]="g.current" /> / <app-amount [value]="g.target" /></span>
                            </div>
                            <!-- Icon -->
                            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" [ngClass]="g.bgClass">
                                <i [class]="g.icon" [ngClass]="g.iconClass" class="text-sm"></i>
                            </div>
                        </li>
                    }
                </ul>
            }
        </div>
    `
})
export class SavingsProgress implements OnInit, OnDestroy {
    private savingsService = inject(SavingsService);
    private stateService = inject(AssetsStateService);
    private router = inject(Router);
    readonly i18n = inject(I18nService);
    
    private subscription?: Subscription;
    loading = signal(true);
    goals = signal<GoalDisplay[]>([]);

    async ngOnInit() {
        await this.loadGoals();
        
        // Subscribe to savings updates to refresh the list
        this.subscription = this.stateService.savingsUpdated$.subscribe(() => {
            this.loadGoals();
        });
    }
    
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async loadGoals() {
        this.loading.set(true);
        try {
            const gs = await this.savingsService.getGoals();
            // Uniform chrome — icon glyph differentiates the goal, not the color.
            const sharedChrome = {
                bgClass: 'bg-warm-100 dark:bg-warm-800',
                iconClass: 'text-warm-700 dark:text-warm-300',
                progressClass: 'bg-gradient-to-r from-brand-700 to-brand-500 dark:from-brand-300 dark:to-brand-200',
                textColorClass: 'text-brand-700 dark:text-brand-300',
            };
            const colorConfigs = [
                { ...sharedChrome, icon: 'pi pi-shield' },
                { ...sharedChrome, icon: 'pi pi-building' },
                { ...sharedChrome, icon: 'pi pi-sun' },
                { ...sharedChrome, icon: 'pi pi-star' },
                { ...sharedChrome, icon: 'pi pi-flag' },
            ];

            const mapped = gs
                .map((g, index) => ({
                    label: g.label,
                    current: g.current,
                    target: g.target,
                    percent: Math.min(100, Math.max(0, Math.round((g.current / (g.target || 1)) * 100))),
                    ...colorConfigs[index % colorConfigs.length]
                }))
                .sort((a, b) => b.percent - a.percent)
                .slice(0, 4);

            this.goals.set(mapped);
        } catch (error) {
            console.error('Error loading goals:', error);
            this.goals.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    ringDash(percent: number): string {
        const circumference = 2 * Math.PI * 15.5;
        const filled = (Math.min(100, percent) / 100) * circumference;
        return `${filled} ${circumference}`;
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
