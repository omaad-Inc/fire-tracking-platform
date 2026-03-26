import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatrimoineService, PatrimoineAssetItemDto } from '../../service/patrimoine.service';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { I18nService } from '../../../i18n/i18n.service';

interface MoverItem extends PatrimoineAssetItemDto {
    gainPct: number;
}

@Component({
    selector: 'app-top-movers-widget',
    standalone: true,
    imports: [CommonModule, AppCurrencyPipe],
    template: `
        <div class="card h-full">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <i class="pi pi-bolt text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('dashboard.topMovers') }}</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-xs m-0">{{ i18n.t('dashboard.topMoversSubtitle') }}</p>
                    </div>
                </div>
            </div>

            @if (loading()) {
                <div class="flex flex-col gap-4">
                    @for (i of [1,2,3]; track i) {
                        <div class="animate-pulse flex items-center gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                            <div class="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700"></div>
                            <div class="flex-1 space-y-2">
                                <div class="h-3 bg-surface-200 dark:bg-surface-700 rounded w-2/3"></div>
                                <div class="h-2 bg-surface-200 dark:bg-surface-700 rounded w-1/3"></div>
                            </div>
                        </div>
                    }
                </div>
            } @else if (movers().length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-center">
                    <div class="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                        <i class="pi pi-chart-bar text-surface-400 text-xl"></i>
                    </div>
                    <p class="text-surface-500 dark:text-surface-400 text-sm">{{ i18n.t('dashboard.noMovers') }}</p>
                </div>
            } @else {
                <div class="flex flex-col gap-3">
                    @for (item of movers(); track item.name; let i = $index) {
                        <div class="flex items-center gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                 [style.background]="getIconBg(i)">
                                <i [class]="getIcon(item.category)" class="text-white text-sm"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-surface-900 dark:text-surface-0 text-sm truncate">{{ item.name }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-xs">{{ item.value | appCurrency }}</div>
                            </div>
                            <div class="flex items-center gap-3">
                                <svg viewBox="0 0 60 24" width="60" height="24" preserveAspectRatio="none">
                                    <polyline
                                        [attr.points]="getSparkline(item, i)"
                                        fill="none"
                                        [attr.stroke]="item.gainPct >= 0 ? '#10b981' : '#f43f5e'"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <span class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold shrink-0"
                                      [ngClass]="item.gainPct >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                                    <i class="pi text-xs mr-1" [ngClass]="item.gainPct >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    {{ item.gainPct >= 0 ? '+' : '' }}{{ item.gainPct | number:'1.1-1' }}%
                                </span>
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class TopMoversWidget implements OnInit {
    private patrimoineService = inject(PatrimoineService);
    readonly i18n = inject(I18nService);

    loading = signal(true);
    movers = signal<MoverItem[]>([]);

    private iconBgs = [
        'linear-gradient(135deg, #6366f1, #4f46e5)',
        'linear-gradient(135deg, #06b6d4, #0891b2)',
        'linear-gradient(135deg, #10b981, #059669)',
        'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        'linear-gradient(135deg, #f59e0b, #d97706)'
    ];

    async ngOnInit() {
        try {
            const assets = await this.patrimoineService.getAssets();
            const withGain: MoverItem[] = assets
                .filter(a => a.deltaAbs != null || a.deltaPct != null)
                .map(a => ({
                    ...a,
                    gainPct: a.deltaPct != null
                        ? a.deltaPct
                        : (a.deltaAbs != null && a.value > 0
                            ? (a.deltaAbs / (a.value - a.deltaAbs)) * 100
                            : 0)
                }));

            const sorted = withGain
                .sort((a, b) => Math.abs(b.gainPct) - Math.abs(a.gainPct))
                .slice(0, 3);

            this.movers.set(sorted);
        } catch {
            // silently fail — widget is non-critical
        } finally {
            this.loading.set(false);
        }
    }

    getIconBg(index: number): string {
        return this.iconBgs[index % this.iconBgs.length];
    }

    getIcon(category?: string): string {
        const map: Record<string, string> = {
            real_estate: 'pi pi-building',
            stocks: 'pi pi-chart-line',
            bonds: 'pi pi-chart-bar',
            crypto: 'pi pi-bitcoin',
            cash: 'pi pi-wallet',
            retirement: 'pi pi-shield',
            life_insurance: 'pi pi-heart',
            vehicle: 'pi pi-car',
            savings_account: 'pi pi-piggy-bank'
        };
        return map[category ?? ''] ?? 'pi pi-box';
    }

    getSparkline(item: MoverItem, index: number): string {
        const isPositive = item.gainPct >= 0;
        const seed = Math.abs(Math.round(item.value + index * 1337));
        const pts: number[] = [];
        let y = 12;
        for (let i = 0; i < 6; i++) {
            const rnd = ((seed * (i + 1) * 7919) % 1000) / 1000;
            const step = (rnd - 0.4) * 6;
            y = Math.max(3, Math.min(21, y + step + (isPositive ? 0.8 : -0.8)));
            pts.push(y);
        }
        return pts.map((yv, x) => `${x * 12},${24 - yv}`).join(' ');
    }
}
