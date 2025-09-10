import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SavingsService, SavingsGoal } from '../../service/savings.service';

@Component({
    standalone: true,
    selector: 'app-savings-progress',
    imports: [CommonModule, RouterModule],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <div class="font-semibold text-xl">Progression de l'Epargne</div>
                <a [routerLink]="['/pages/savings']" class="text-primary font-medium text-sm">View More</a>
            </div>
            <ul class="list-none p-0 m-0">
                <li *ngFor="let g of goals" class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">{{ g.label }}</span>
                        <div class="mt-1 text-muted-color">{{ g.current | currency:'EUR' }} / {{ g.target | currency:'EUR' }}</div>
                    </div>
                    <div class="mt-2 md:mt-0 flex items-center">
                        <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24" style="height: 8px">
                            <div class="h-full" [ngClass]="g.colorClass" [ngStyle]="{ width: g.percent + '%' }"></div>
                        </div>
                        <span class="ml-4 font-medium" [ngClass]="g.textColorClass">{{ g.percent }}%</span>
                    </div>
                </li>
            </ul>
        </div>
    `
})
export class SavingsProgress {
    goals: { label: string; current: number; target: number; percent: number; colorClass: string; textColorClass: string }[] = [];

    constructor(private savingsService: SavingsService) {
        this.loadGoals();
    }

    private loadGoals() {
        this.savingsService.getGoals().then((gs: SavingsGoal[]) => {
            this.goals = gs.map((g) => ({
                label: g.label,
                current: g.current,
                target: g.target,
                percent: Math.min(100, Math.max(0, Math.round((g.current / (g.target || 1)) * 100))),
                colorClass: g.colorClass,
                textColorClass: g.textColorClass
            }));
        });
    }
}
