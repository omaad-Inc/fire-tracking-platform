import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect } from '@angular/core';
import { ChartModule } from 'primeng/chart';

@Component({
    selector: 'app-savings-progress',
    template: `
        <div class="card !mb-8 h-full flex flex-col">
            <div class="mb-4">
            <div class="font-semibold text-xl">Epargne</div>
            </div>
            <p-chart type="line" [data]="data" [options]="options" class="h-[30rem]" />
        </div>
    `,
    standalone: true,
    imports: [ChartModule]
})
export class SavingsProgress implements OnInit {
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
            const textColor = documentStyle.getPropertyValue('--text-color') || '#fff';
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#aaa';
            const borderColor = '#059669';
            const backgroundColor = 'rgba(5, 150, 105, 0.2)';

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
                        tension: 0.4,
                        backgroundColor: backgroundColor,
                        pointRadius: 3
                    }
                ]
            };

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
                                    return (value / 1000) + 'K€';
                                }
                                return value + '€';
                            }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                }
            };
            this.cd.markForCheck();
        }
    }
}
