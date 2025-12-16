import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { SavingsService, SavingsSeriesPoint } from '../../service/savings.service';

@Component({
    selector: 'app-savings-progress',
    template: `
        <div class="card h-full">
            <div class="flex items-center justify-between mb-4">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">Évolution de l'Épargne</div>
                <span class="text-emerald-500 text-sm font-medium">Progression mensuelle</span>
            </div>
            <p-chart type="line" [data]="data" [options]="options" class="w-full min-h-[120px] max-h-[300px]" />
        </div>
    `,
    standalone: true,
    imports: [ChartModule]
})
export class SavingsProgress implements OnInit {
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
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#94a3b8';
            
            // Couleurs harmonieuses avec le thème (emerald)
            const borderColor = '#10b981';
            const backgroundColor = 'rgba(16, 185, 129, 0.15)';

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
                            backgroundColor: backgroundColor,
                            tension: 0.4,
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: borderColor,
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: borderColor,
                            pointHoverBorderColor: '#fff'
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
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context: any) {
                                return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColorSecondary,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: textColorSecondary,
                            font: {
                                size: 11
                            },
                            callback: function(value: number) {
                                if (value >= 1000) {
                                    return (value / 1000) + 'K€';
                                }
                                return value + '€';
                            }
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)',
                            drawBorder: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            };
            this.cd.markForCheck();
        }
    }
}
