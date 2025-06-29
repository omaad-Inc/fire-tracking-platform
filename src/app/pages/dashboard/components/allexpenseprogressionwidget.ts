import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';


@Component({
    standalone: true,
    selector: 'app-expenses-progression-widget',
    imports: [CommonModule, ChartModule, FluidModule],
    template: `
    <div class="card !mb-8 h-full flex flex-col">
        <div class="mb-4">
            <div class="font-semibold text-xl">All Expenses</div>
        </div>
        <div class="flex-1 flex items-center justify-center">
            <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" class="w-full max-w-[350px]"></p-chart >
        </div>
    </div>
    `
})
export class AllExpensesProgression {

    pieData: any;

    pieOptions: any;


    subscription: Subscription;
    constructor(private layoutService: LayoutService) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            this.initCharts();
        });
    }

    ngOnInit() {
        this.initCharts();
    }

    initCharts() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
       
        this.pieData = {
            labels: ['A', 'B', 'C'],
            datasets: [
                {
                    data: [540, 325, 702],
                    backgroundColor: [documentStyle.getPropertyValue('--p-indigo-500'), documentStyle.getPropertyValue('--p-purple-500'), documentStyle.getPropertyValue('--p-teal-500')],
                    hoverBackgroundColor: [documentStyle.getPropertyValue('--p-indigo-400'), documentStyle.getPropertyValue('--p-purple-400'), documentStyle.getPropertyValue('--p-teal-400')]
                }
            ]
        };

        this.pieOptions = {
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        color: textColor
                    }
                }
            }
        };

       
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
    

