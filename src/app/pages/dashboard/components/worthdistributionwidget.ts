import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';


@Component({
    standalone: true,
    selector: 'app-worth-distribution-widget',
    imports: [CommonModule, ChartModule, FluidModule],
    template: `
    <div class="card !mb-8 h-full flex flex-col">
        <div class="mb-4">
            <div class="font-semibold text-xl">Distribution du Patrimoine</div>
        </div>
        <div class="flex-1 flex items-center justify-center relative">
            <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" class="w-full max-w-[350px]"></p-chart >
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span class="font-bold text-xl">{{ total | number:'1.0-0' }} €</span>
            </div>
        </div>
    </div>
    `
})
export class WorthDistributionWidget {

    pieData: any;

    pieOptions: any;

    total: number = 0;

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
       
        const values = [1200, 6500, 300, 100];
        this.total = values.reduce((a, b) => a + b, 0);

        this.pieData = {
            labels: ['Compte bancaire', 'Matelas de sécurité', 'PEA bourso', 'Immobilier'],
            datasets: [
                {
                    data: values,
                    backgroundColor: [
                        documentStyle.getPropertyValue('--p-indigo-500'),
                        documentStyle.getPropertyValue('--p-teal-500'),
                        documentStyle.getPropertyValue('--p-purple-500'),
                        documentStyle.getPropertyValue('--p-orange-500')
                    ],
                    hoverBackgroundColor: [
                        documentStyle.getPropertyValue('--p-indigo-400'),
                        documentStyle.getPropertyValue('--p-teal-400'),
                        documentStyle.getPropertyValue('--p-purple-400'),
                        documentStyle.getPropertyValue('--p-orange-400')
                    ]
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
            },
            cutout: '75%'
        };

       
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
    

