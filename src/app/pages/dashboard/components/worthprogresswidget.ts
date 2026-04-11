import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-worth-progress',
    template: `
        <div class="card h-full">
            <div class="flex items-center justify-between mb-4">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ i18n.t('dashboard.worthEvolution') }}</div>
                @if (!loading()) {
                    <span class="text-cyan-500 text-sm font-medium">{{ dataPoints().length }} {{ i18n.t('dashboard.months') }}</span>
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
                    <p class="text-surface-500 dark:text-surface-400 text-sm">{{ i18n.t('dashboard.noDataYet') }}</p>
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
    private cs = inject(CurrencyService);
    readonly i18n = inject(I18nService);

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
            const progression = await this.dashboardService.getWorthProgression(0); // 0 = all-time
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
            const cs = this.cs;
            
            // Couleurs harmonieuses avec le thème (cyan)
            const borderColor = '#06b6d4';

            const points = this.dataPoints();
            
            this.data = {
                labels: points.map(p => p.label),
                datasets: [
                    {
                        data: points.map(p => p.value),
                        fill: false,
                        borderColor: borderColor,
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
                                return cs.format(context.raw, 0);
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
                            callback: cs.tickFormatter()
                        },
                        grid: {
                            display: false,
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
