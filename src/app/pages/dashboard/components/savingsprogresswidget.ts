import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SavingsService, SavingsGoal } from '../../service/savings.service';

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
            <ul class="list-none p-0 m-0 space-y-5">
                <li *ngFor="let g of goals" class="group">
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
            </ul>
        </div>
    `
})
export class SavingsProgress {
    goals: { 
        label: string; 
        current: number; 
        target: number; 
        percent: number; 
        icon: string;
        bgClass: string;
        iconClass: string;
        progressClass: string;
        textColorClass: string;
    }[] = [];

    constructor(private savingsService: SavingsService, private router: Router) {
        this.loadGoals();
    }

    private loadGoals() {
        this.savingsService.getGoals().then((gs: SavingsGoal[]) => {
            const colorConfigs = [
                { bgClass: 'bg-indigo-500/10', iconClass: 'text-indigo-500', progressClass: 'bg-gradient-to-r from-indigo-600 to-indigo-400', textColorClass: 'text-indigo-500', icon: 'pi pi-shield' },
                { bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500', progressClass: 'bg-gradient-to-r from-emerald-600 to-emerald-400', textColorClass: 'text-emerald-500', icon: 'pi pi-building' },
                { bgClass: 'bg-cyan-500/10', iconClass: 'text-cyan-500', progressClass: 'bg-gradient-to-r from-cyan-600 to-cyan-400', textColorClass: 'text-cyan-500', icon: 'pi pi-sun' }
            ];

            this.goals = gs.map((g, index) => ({
                label: g.label,
                current: g.current,
                target: g.target,
                percent: Math.min(100, Math.max(0, Math.round((g.current / (g.target || 1)) * 100))),
                ...colorConfigs[index % colorConfigs.length]
            }));
        });
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
