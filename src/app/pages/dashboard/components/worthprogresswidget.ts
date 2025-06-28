import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect } from '@angular/core';
import { ChartModule } from 'primeng/chart';

@Component({
    selector: 'app-worth-progress',
    template: `
        <div class="card !mb-8">
            <div class="font-semibold text-xl mb-4">Évolution du patrimoine</div>
            <p-chart type="line" [data]="data" [options]="options" class="h-[30rem]" />
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
            const textColor = documentStyle.getPropertyValue('--text-color') || '#fff';
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#aaa';
            const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#333';
            const borderColor = '#059669';
            const backgroundColor = 'rgba(5, 150, 105, 0.2)';

            this.data = {
                labels: [
                    'Juin 2025', 'Juil 2025', 'Août 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025',
                    'Déc 2025', 'Jan 2026', 'Fév 2026', 'Mar 2026'
                ],
                datasets: [
                    {
                        label: 'Patrimoine brut',
                        data: [54, 100, 200, 400, 900, 1800, 1200, 1000, 800, 54],
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
                        labels: {
                            color: textColor
                        }
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
                            color: textColorSecondary
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
