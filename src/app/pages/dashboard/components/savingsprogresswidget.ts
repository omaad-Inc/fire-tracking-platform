import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-savings-progress',
    imports: [CommonModule, RouterModule],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <div class="font-semibold text-xl">Progression Epargne</div>
                <a [routerLink]="['/pages/savings']" class="text-primary font-medium text-sm">View More</a>
            </div>
            <ul class="list-none p-0 m-0">
                <li class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">Emergency Fund</span>
                        <div class="mt-1 text-muted-color">€5,000 / €10,000</div>
                    </div>
                    <div class="mt-2 md:mt-0 flex items-center">
                        <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24" style="height: 8px">
                            <div class="bg-blue-700 h-full" style="width: 50%"></div>
                        </div>
                        <span class="text-blue-700 ml-4 font-medium">50%</span>
                    </div>
                </li>
                <li class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">Plan Epargne Retraite</span>
                        <div class="mt-1 text-muted-color">€8,000 / €20,000</div>
                    </div>
                    <div class="mt-2 md:mt-0 ml-0 md:ml-20 flex items-center">
                        <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24" style="height: 8px">
                            <div class="bg-green-600 h-full" style="width: 40%"></div>
                        </div>
                        <span class="text-green-600 ml-4 font-medium">40%</span>
                    </div>
                </li>
                <li class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">Vacation</span>
                        <div class="mt-1 text-muted-color">€1,200 / €3,000</div>
                    </div>
                    <div class="mt-2 md:mt-0 ml-0 md:ml-20 flex items-center">
                        <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24" style="height: 8px">
                            <div class="bg-orange-600 h-full" style="width: 40%"></div>
                        </div>
                        <span class="text-orange-600 ml-4 font-medium">40%</span>
                    </div>
                </li>
            </ul>
        </div>
    `
})
export class SavingsProgress {}
