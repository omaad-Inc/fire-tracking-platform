import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-debts-overview',
  imports: [CommonModule, RouterModule],
    template: `<div class="card">
        <div class="flex justify-between items-center mb-6">
            <div class="font-semibold text-xl">Vue Globale des Dettes</div>
            <a [routerLink]="['/pages/debts']" class="text-primary font-medium text-sm">View More</a>
        </div>
        <ul class="list-none p-0 m-0">
            <li class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">2 Months Rent</span>
                    <div class="mt-1 text-muted-color">€1,200 / €2,400</div>
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
                    <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">Friend Debt</span>
                    <div class="mt-1 text-muted-color">€300 / €1,000</div>
                </div>
                <div class="mt-2 md:mt-0 ml-0 md:ml-20 flex items-center">
                    <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24" style="height: 8px">
                        <div class="bg-green-600 h-full" style="width: 30%"></div>
                    </div>
                    <span class="text-green-600 ml-4 font-medium">30%</span>
                </div>
            </li>
            <li class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">Car Loan</span>
                    <div class="mt-1 text-muted-color">€5,000 / €15,000</div>
                </div>
                <div class="mt-2 md:mt-0 ml-0 md:ml-20 flex items-center">
                    <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24" style="height: 8px">
                        <div class="bg-orange-600 h-full" style="width: 33%"></div>
                    </div>
                    <span class="text-orange-600 ml-4 font-medium">33%</span>
                </div>
            </li>
        </ul>
    </div>`
})
export class DebtsOverview {}
