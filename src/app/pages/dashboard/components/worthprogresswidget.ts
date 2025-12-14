import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect } from '@angular/core';
import { ChartModule } from 'primeng/chart';

@Component({
    selector: 'app-worth-progress',
    template: `
        <div class="card h-full">
            <div class="flex items-center justify-between mb-4">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">Évolution du patrimoine</div>
                <span class="text-cyan-500 text-sm font-medium">25 mois</span>
            </div>
            <p-chart type="line" [data]="data" [options]="options" class="w-full min-h-[120px] max-h-[300px]" />
        </div>
    `,
    standalone: true,
    imports: [ChartModule]
})
export class WorthProgress implements OnInit {
    data: any;
    options: any;
    platformId = inject(PLATFORM_ID);
    constructor(private cd: ChangeDetectorRef) {}

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
            
            // Couleurs harmonieuses avec le thème (cyan)
            const borderColor = '#06b6d4';
            const backgroundColor = 'rgba(6, 182, 212, 0.15)';

            this.data = {
                labels: [
                    'Juin 2025', 'Juil 2025', 'Août 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025',
                    'Déc 2025', 'Jan 2026', 'Fév 2026', 'Mar 2026', 'Avr 2026', 'Mai 2026', 'Juin 2026', 'Juil 2026', 'Août 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Déc 2026', 'Jan 2027', 'Fév 2027', 'Mar 2027', 'Avr 2027', 'Mai 2027', 'Juin 2027'
                ],
                datasets: [
                    {
                        data: [1000, 1200, 1500, 1800, 2200, 2700, 3200, 3800, 4500, 5200, 6000, 6800, 7600, 8300, 9000, 9500, 9800, 10000, 10200, 10400, 10600, 10800, 10900, 10950, 11000],
                        fill: true,
                        borderColor: borderColor,
                        backgroundColor: backgroundColor,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 3,
                        pointBackgroundColor: borderColor,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: borderColor,
                        pointHoverBorderColor: '#fff'
                    }
                ]
            };

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
                        borderColor: 'rgba(6, 182, 212, 0.5)',
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
                                size: 10
                            },
                            maxRotation: 45
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
