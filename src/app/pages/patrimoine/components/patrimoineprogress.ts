import { isPlatformBrowser, NgClass } from '@angular/common';
import { Component, OnInit, OnDestroy, PLATFORM_ID, ChangeDetectorRef, inject, effect, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { Subscription, firstValueFrom } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-patrimoine-progress',
    template: `
        <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-5 h-full">
            <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-brand-50/30 dark:from-surface-800 dark:via-surface-800/90 dark:to-brand-900/10"></div>
            <div class="absolute top-3 left-3 w-14 h-14 rounded-full bg-brand-100/25 dark:bg-brand-800/10 blur-md"></div>
            <div class="relative flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">Patrimoine Brut</div>
                    <i class="pi pi-chevron-down text-surface-500 text-sm cursor-pointer"></i>
                </div>
                @if (!loading()) {
                    <div class="flex items-center gap-1">
                        @for (r of ranges; track r.months) {
                            <button (click)="setRange(r.months)"
                                class="px-3 py-1 text-xs rounded-lg transition-colors"
                                [ngClass]="selectedMonths() === r.months
                                    ? 'bg-brand-700 text-white dark:bg-brand-300 dark:text-brand-900'
                                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'">
                                {{ r.label }}
                            </button>
                        }
                    </div>
                }
            </div>
            
            @if (loading()) {
                <div class="relative animate-pulse">
                    <div class="h-[200px] md:h-[300px] bg-surface-200 dark:bg-surface-700 rounded"></div>
                </div>
            } @else if (dataPoints().length === 0) {
                <div class="relative flex flex-col items-center justify-center h-[200px] md:h-[300px] text-center">
                    <div class="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                        <i class="pi pi-chart-line text-xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-500 dark:text-surface-400 text-sm">Pas encore de données</p>
                </div>
            } @else {
                <div class="relative mb-4">
                    <div class="text-surface-500 dark:text-surface-400 text-sm mb-1">{{ currentDate() }}</div>
                    <div class="text-surface-900 dark:text-surface-0 font-bold text-3xl"><app-amount [value]="currentValue()" /></div>
                </div>
                <div class="relative">
                    <p-chart type="line" [data]="data" [options]="options" class="w-full min-h-[180px] md:min-h-[250px]" />
                </div>
            }
        </div>
    `,
    standalone: true,
    imports: [ChartModule, NgClass, AppAmountComponent]
})
export class PatrimoineProgress implements OnInit, OnDestroy {
    private platformId = inject(PLATFORM_ID);
    private cd = inject(ChangeDetectorRef);
    private dashboardService = inject(DashboardService);
    private stateService = inject(AssetsStateService);
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private api = inject(ApiService);
    
    private subscription?: Subscription;
    
    loading = signal(true);
    dataPoints = signal<ChartDataPoint[]>([]);
    currentValue = signal(0);
    currentDate = signal('');

    readonly ranges = [
        { label: '1M', months: 1 },
        { label: '3M', months: 3 },
        { label: '6M', months: 6 },
        { label: '1A', months: 12 },
        { label: 'Max', months: 0 },
    ];

    selectedMonths = signal(0);

    setRange(months: number) {
        this.selectedMonths.set(months);
        this.loadData();
    }
    
    data: any;
    options: any;

    themeEffect = effect(() => {
        if (this.dataPoints().length > 0) {
            this.initChart();
        }
    });

    ngOnInit() {
        this.loadData();
        
        // Subscribe to asset updates to refresh the chart (invalidate cache first)
        this.subscription = this.stateService.assetsUpdated$.subscribe(() => {
            this.dashboardService.invalidateCache();
            this.loadData();
        });
    }
    
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
    
    private async loadData() {
        this.loading.set(true);
        try {
            // Fetch chart progression and actual assets in parallel
            const [progression, assets] = await Promise.all([
                this.dashboardService.getTotalAssetsProgression(this.selectedMonths()),
                firstValueFrom(this.api.getAssets(0, 200))
            ]);
            this.dataPoints.set(progression);

            if (progression.length > 0) {
                // Always derive the displayed total from the real current_value of each asset,
                // never from the last interpolated chart point which can be slightly off.
                const realTotal = assets.reduce((sum, a) => sum + a.current_value, 0);
                this.currentValue.set(realTotal);
                this.currentDate.set(this.formatCurrentDate());
                this.initChart();
            }
        } catch (error) {
            console.error('Error loading total assets progression:', error);
            this.dataPoints.set([]);
        } finally {
            this.loading.set(false);
        }
    }
    
    private formatCurrentDate(): string {
        const date = new Date();
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
    }

    initChart() {
        if (isPlatformBrowser(this.platformId)) {
            const cs = this.cs;
            const isDark = document.documentElement.classList.contains('app-dark');

            // Brand-tokenized chart palette — single source of truth in
            // core/theme/chart-theme.ts. Inlined here to avoid breaking the
            // build dependency graph.
            const borderColor = isDark ? '#8A98AE' : '#1A2740';        // brand-300 / brand-700
            const textColorSecondary = isDark ? '#9C988C' : '#6E6A60'; // warm-400 / warm-500

            const points = this.dataPoints();

            this.data = {
                labels: points.map(p => p.label),
                datasets: [
                    {
                        label: 'Patrimoine Brut',
                        data: points.map(p => p.value),
                        fill: false,
                        borderColor: borderColor,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointBackgroundColor: borderColor,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: borderColor,
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
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
                        backgroundColor: 'rgba(20, 19, 15, 0.95)',
                        titleColor: '#FAF8F4',
                        bodyColor: '#DEDAD0',
                        borderColor: 'rgba(199, 123, 60, 0.30)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: function(context: any) {
                                return context[0].label || '';
                            },
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
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 12
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
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 6
                    }
                }
            };
            this.cd.markForCheck();
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
