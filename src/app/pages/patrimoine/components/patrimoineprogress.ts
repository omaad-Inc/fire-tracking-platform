import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { SavingsService, SavingsSeriesPoint } from '../../service/savings.service';

@Component({
    selector: 'app-patrimoine-progress',
    template: `
        <div class="card h-full">
            <div class="mb-4">
                <div class="font-semibold text-xl">Patrimoine brut</div>
            </div>
            <p-chart type="line" [data]="data" [options]="options" class="w-full min-h-[120px] max-h-[300px]" />
        </div>
    `,
    standalone: true,
    imports: [ChartModule]
})
export class PatrimoineProgress implements OnInit {
    data: any;
    options: any;
    platformId = inject(PLATFORM_ID);
    constructor(private cd: ChangeDetectorRef, private savingsService: SavingsService) {}

    themeEffect = effect(() => {
        this.initChart();
    });

    ngOnInit() {
        this.initChart();
    }

    initChart() {
        if (isPlatformBrowser(this.platformId)) {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--text-color') || '#fff';
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#aaa';
            const borderColor = '#a855f7';
            const backgroundColor = 'rgba(168, 85, 247, 0.15)';

            this.savingsService.getProgressSeries().then((series: SavingsSeriesPoint[]) => {
                const labels = series.map((p) => p.label);
                const values = series.map((p) => p.value);
                this.data = {
                    labels,
                    datasets: [
                        {
                            data: values,
                            fill: true,
                            borderColor: borderColor,
                            tension: 0.4,
                            backgroundColor: backgroundColor,
                            pointRadius: 5,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: borderColor,
                            pointBorderWidth: 2
                        }
                    ]
                };
                this.cd.markForCheck();
            });

            this.options = {
                maintainAspectRatio: false,
                aspectRatio: 0.8,
                plugins: {
                    legend: {
                        display: false,
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: textColorSecondary,
                            callback: function(value: number) {
                                if (value >= 1000) {
                                    return '€' + (value / 1000) + 'K';
                                }
                                return '€' + value;
                            }
                        },
                        grid: {
                            display: true,
                            drawBorder: false
                        }
                    }
                }
            };
            this.cd.markForCheck();
        }
    }
}
