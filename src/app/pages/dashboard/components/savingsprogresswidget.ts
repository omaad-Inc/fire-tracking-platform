import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SavingsService, SavingsGoalDisplay } from '../../service/savings.service';
import { AssetsStateService } from '../../service/assets-state.service';

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
    imports: [CommonModule, RouterModule],
    template: `
        <div class="card h-full">
            <div class="flex justify-between items-center mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">Progression de l'Épargne</div>
                <a [routerLink]="link('pages', 'savings')" class="text-indigo-500 hover:text-indigo-400 font-medium text-sm transition-colors">
                    Voir plus <i class="pi pi-chevron-right text-xs ml-1"></i>
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
            } @else if (goals().length === 0) {
                <div class="flex flex-col items-center justify-center py-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                        <i class="pi pi-wallet text-2xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 mb-2">Aucun objectif d'épargne</p>
                    <a [routerLink]="link('pages', 'savings')" class="text-indigo-500 hover:text-indigo-400 text-sm">
                        Créer un objectif <i class="pi pi-arrow-right text-xs ml-1"></i>
                    </a>
                </div>
            } @else {
                <ul class="list-none p-0 m-0 space-y-5">
                    @for (g of goals(); track g.label) {
                        <li class="group">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl flex items-center justify-center" [ngClass]="g.bgClass">
                                        <i [class]="g.icon" [ngClass]="g.iconClass"></i>
                                    </div>
                                    <div>
                                        <span class="text-surface-900 dark:text-surface-0 font-medium block">{{ g.label }}</span>
                                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ g.current | currency:'EUR':'symbol':'1.0-0' }} / {{ g.target | currency:'EUR':'symbol':'1.0-0' }}</span>
                                    </div>
                                </div>
                                <span class="font-bold text-lg" [ngClass]="g.textColorClass">{{ g.percent }}%</span>
                            </div>
                            <div class="relative h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-500" 
                                     [ngClass]="g.progressClass" 
                                     [ngStyle]="{ width: g.percent + '%' }">
                                </div>
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
            const colorConfigs = [
                { bgClass: 'bg-indigo-500/10', iconClass: 'text-indigo-500', progressClass: 'bg-gradient-to-r from-indigo-600 to-indigo-400', textColorClass: 'text-indigo-500', icon: 'pi pi-shield' },
                { bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500', progressClass: 'bg-gradient-to-r from-emerald-600 to-emerald-400', textColorClass: 'text-emerald-500', icon: 'pi pi-building' },
                { bgClass: 'bg-cyan-500/10', iconClass: 'text-cyan-500', progressClass: 'bg-gradient-to-r from-cyan-600 to-cyan-400', textColorClass: 'text-cyan-500', icon: 'pi pi-sun' },
                { bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500', progressClass: 'bg-gradient-to-r from-violet-600 to-violet-400', textColorClass: 'text-violet-500', icon: 'pi pi-star' },
                { bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500', progressClass: 'bg-gradient-to-r from-amber-600 to-amber-400', textColorClass: 'text-amber-500', icon: 'pi pi-flag' }
            ];

            const mapped = gs.map((g, index) => ({
                label: g.label,
                current: g.current,
                target: g.target,
                percent: Math.min(100, Math.max(0, Math.round((g.current / (g.target || 1)) * 100))),
                ...colorConfigs[index % colorConfigs.length]
            }));
            
            this.goals.set(mapped);
        } catch (error) {
            console.error('Error loading goals:', error);
            this.goals.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
