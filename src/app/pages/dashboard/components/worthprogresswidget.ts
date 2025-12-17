import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';

@Component({
    selector: 'app-worth-progress',
    template: `
        <div class="card h-full">
            <div class="flex items-center justify-between mb-4">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">Évolution du patrimoine</div>
                @if (!loading()) {
                    <span class="text-cyan-500 text-sm font-medium">{{ dataPoints().length }} mois</span>
                }
            </div>
            
            @if (loading()) {
                <div class="animate-pulse">
                    <div class="h-[200px] bg-surface-200 dark:bg-surface-700 rounded"></div>
                </div>
            } @else if (dataPoints().length === 0) {
                <div class="flex flex-col items-center justify-center h-[200px] text-center">
                    <div class="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                        <i class="pi pi-chart-line text-xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-500 dark:text-surface-400 text-sm">Pas encore de données</p>
                </div>
            } @else {
                <p-chart type="line" [data]="data" [options]="options" class="w-full min-h-[120px] max-h-[300px]" />
            }
        </div>
    `,
    standalone: true,
    imports: [ChartModule]
})
export class WorthProgress implements OnInit {
    private dashboardService = inject(DashboardService);
    private platformId = inject(PLATFORM_ID);
    private cd = inject(ChangeDetectorRef);

    loading = signal(true);
    dataPoints = signal<ChartDataPoint[]>([]);
    
    data: any;
    options: any;

    themeEffect = effect(() => {
        if (this.dataPoints().length > 0) {
            this.initChart();
        }
    });

    async ngOnInit() {
        await this.loadData();
    }

    private async loadData() {
        this.loading.set(true);
        try {
            const progression = await this.dashboardService.getWorthProgression(25);
            this.dataPoints.set(progression);
            
            if (progression.length > 0) {
                this.initChart();
            }
        } catch (error) {
            console.error('Error loading worth progression:', error);
            this.dataPoints.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    initChart() {
        if (isPlatformBrowser(this.platformId)) {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#94a3b8';
            
            // Couleurs harmonieuses avec le thème (cyan)
            const borderColor = '#06b6d4';
            const backgroundColor = 'rgba(6, 182, 212, 0.15)';

            const points = this.dataPoints();
            
            this.data = {
                labels: points.map(p => p.label),
                datasets: [
                    {
                        data: points.map(p => p.value),
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
                                    return (value / 1000).toFixed(0) + 'K€';
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
