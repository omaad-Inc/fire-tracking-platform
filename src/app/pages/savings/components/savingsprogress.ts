import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect } from '@angular/core';
import { ChartModule } from 'primeng/chart';

@Component({
    selector: 'app-savings-progress',
    template: `
        <div class="card h-full">
            <div class="mb-4">
                <div class="font-semibold text-xl">Epargne</div>
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
            const borderColor = '#a855f7';
            const backgroundColor = 'rgba(168, 85, 247, 0.15)';

            this.data = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        data: [1000, 2200, 3400, 4800, 6000, 6600],
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
                                    return '$' + (value / 1000) + 'K';
                                }
                                return '$' + value;
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
