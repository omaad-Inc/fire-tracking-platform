import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, merge } from 'rxjs';
import { PatrimoineService } from '../../service/patrimoine.service';
import { DashboardService, DashboardStats } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { I18nService } from '../../../i18n/i18n.service';

interface AccountView {
    id: number;
    name: string;
    value: number;      // EUR base
    icon: string;
}

const MONETARY_CATEGORIES = ['cash', 'savings_account', 'mobile_money'];
const ACCOUNT_ICONS: Record<string, string> = {
    mobile_money: 'pi pi-mobile',
    cash: 'pi pi-wallet',
    savings_account: 'pi pi-dollar',
};

/**
 * The dashboard's new anchor: money movement first. Shows the user's spendable
 * accounts (Wave / cash / mobile money) and this month's in/out/net, with a
 * quick path to add a transaction. FIRE / net worth is demoted below this to an
 * aspirational layer — this is what the user actually touches day to day.
 */
@Component({
    selector: 'app-money-movement-hero',
    standalone: true,
    imports: [CommonModule, RouterModule, AppAmountComponent],
    template: `
        <div class="relative overflow-hidden rounded-2xl bg-brand-900 text-white p-5 sm:p-6">
            <!-- This month -->
            <div class="relative flex items-center justify-between mb-5">
                <div>
                    <p class="text-white/60 text-xs font-medium uppercase tracking-wide">{{ i18n.t('hero.thisMonth') }}</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <span class="text-2xl sm:text-3xl font-black tabular-nums"
                              [ngClass]="net() >= 0 ? 'text-white' : 'text-red-300'">
                            {{ net() >= 0 ? '+' : '−' }}<app-amount [value]="net()" />
                        </span>
                        <span class="text-white/60 text-xs">{{ i18n.t('hero.net') }}</span>
                    </div>
                </div>
                <a [routerLink]="link('pages','transaction')"
                   class="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-ochre-500 hover:bg-ochre-600 text-warm-900 font-semibold text-sm px-3.5 py-2.5 transition-colors">
                    <i class="pi pi-plus text-xs"></i>{{ i18n.t('hero.add') }}
                </a>
            </div>

            <!-- In / Out -->
            <div class="relative grid grid-cols-2 gap-3 mb-5">
                <div class="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                    <div class="flex items-center gap-1.5 text-white/60 text-[11px] font-medium mb-0.5">
                        <i class="pi pi-arrow-down-left text-positive-300"></i>{{ i18n.t('hero.in') }}
                    </div>
                    <span class="text-sm font-bold text-positive-300"><app-amount [value]="stats()?.monthlyIncome ?? 0" /></span>
                </div>
                <div class="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                    <div class="flex items-center gap-1.5 text-white/60 text-[11px] font-medium mb-0.5">
                        <i class="pi pi-arrow-up-right text-red-300"></i>{{ i18n.t('hero.out') }}
                    </div>
                    <span class="text-sm font-bold text-red-300"><app-amount [value]="stats()?.monthlyExpenses ?? 0" /></span>
                </div>
            </div>

            <!-- Accounts -->
            <div class="relative">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-white/60 text-[11px] font-medium uppercase tracking-wide">{{ i18n.t('hero.accounts') }}</p>
                    @if (accounts().length > 0) {
                        <span class="text-white/80 text-xs font-semibold">{{ i18n.t('hero.available') }} <app-amount [value]="totalLiquid()" /></span>
                    }
                </div>
                @if (loading()) {
                    <div class="flex gap-2">
                        @for (i of [1,2,3]; track i) {
                            <div class="h-16 flex-1 rounded-xl bg-white/5 animate-pulse"></div>
                        }
                    </div>
                } @else if (accounts().length === 0) {
                    <a [routerLink]="link('pages','patrimoine','add-asset')"
                       class="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-dashed border-white/20 py-4 text-white/70 text-sm hover:bg-white/10 transition-colors">
                        <i class="pi pi-plus text-xs"></i>{{ i18n.t('hero.addAccount') }}
                    </a>
                } @else {
                    <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        @for (a of accounts(); track a.id) {
                            <a [routerLink]="link('pages','patrimoine','assets', a.id)"
                               class="shrink-0 min-w-[7.5rem] rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 hover:bg-white/10 transition-colors">
                                <div class="flex items-center gap-1.5 text-white/60 text-[11px] mb-1">
                                    <i [class]="a.icon" class="text-xs"></i>
                                    <span class="truncate">{{ a.name }}</span>
                                </div>
                                <span class="text-sm font-bold text-white"><app-amount [value]="a.value" /></span>
                            </a>
                        }
                    </div>
                }
            </div>
        </div>
    `
})
export class MoneyMovementHero implements OnInit, OnDestroy {
    private patrimoineService = inject(PatrimoineService);
    private dashboardService = inject(DashboardService);
    private state = inject(AssetsStateService);
    private router = inject(Router);
    readonly i18n = inject(I18nService);

    private sub?: Subscription;
    loading = signal(true);
    accounts = signal<AccountView[]>([]);
    stats = signal<DashboardStats | null>(null);

    net = computed(() => {
        const s = this.stats();
        return s ? (s.monthlyIncome ?? 0) - (s.monthlyExpenses ?? 0) : 0;
    });
    totalLiquid = computed(() => this.accounts().reduce((sum, a) => sum + a.value, 0));

    async ngOnInit() {
        await this.load();
        this.sub = merge(
            this.state.transactionsUpdated$,
            this.state.assetsUpdated$,
        ).subscribe(() => this.load());
    }

    ngOnDestroy() { this.sub?.unsubscribe(); }

    private async load() {
        try {
            const [assets, stats] = await Promise.all([
                this.patrimoineService.getAssets(),
                this.dashboardService.getStats(),
            ]);
            this.accounts.set(
                assets
                    .filter(a => MONETARY_CATEGORIES.includes(a.category))
                    .map(a => ({ id: a.id, name: a.name, value: a.value, icon: ACCOUNT_ICONS[a.category] ?? 'pi pi-wallet' }))
            );
            this.stats.set(stats);
        } catch {
            // Non-critical hero — leave prior state on failure.
        } finally {
            this.loading.set(false);
        }
    }

    link(...segments: (string | number)[]): any[] {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = match ? match[1] : 'fr';
        return ['/', lang, ...segments];
    }
}
