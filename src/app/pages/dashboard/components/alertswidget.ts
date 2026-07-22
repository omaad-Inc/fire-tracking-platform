import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { I18nService } from '../../../i18n/i18n.service';
import { ApiService, FinancialAlert } from '../../../core/services/api.service';
import { NavService } from '../../../core/services/nav.service';

/**
 * Dashboard "attention" card (S4-5): surfaces the budget/insight alerts feed
 * (/insights/alerts) at the top of Synthèse to drive the weekly habit loop.
 * Renders nothing when there's nothing to flag, so a healthy month stays calm.
 */
@Component({
    selector: 'app-alerts-widget',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule],
    template: `
        @if (alerts().length > 0) {
            <div class="rounded-2xl border border-ochre-200 dark:border-ochre-500/30 bg-ochre-50/60 dark:bg-ochre-500/10 p-4 mb-4">
                <div class="flex items-center gap-2 mb-3">
                    <i class="pi pi-exclamation-triangle text-ochre-600 dark:text-ochre-400"></i>
                    <span class="font-semibold text-surface-900 dark:text-surface-0">{{ t('alerts.title') }}</span>
                    <span class="text-xs text-surface-500 dark:text-surface-400">({{ alerts().length }})</span>
                </div>
                <ul class="space-y-2">
                    @for (a of alerts(); track a.category + a.kind) {
                        <li class="flex items-start gap-2 text-sm">
                            <span class="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                                  [ngClass]="a.severity === 'high' ? 'bg-negative' : 'bg-ochre-500'"></span>
                            <span class="text-surface-700 dark:text-surface-300">{{ message(a) }}</span>
                        </li>
                    }
                </ul>
                <a [routerLink]="nav.link('pages','insights')"
                   class="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-brand-700 dark:text-ochre-400 no-underline">
                    {{ t('alerts.viewInsights') }} <i class="pi pi-chevron-right text-xs"></i>
                </a>
            </div>
        }
    `,
})
export class AlertsWidget implements OnInit {
    private api = inject(ApiService);
    private i18n = inject(I18nService);
    nav = inject(NavService);
    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    alerts = signal<FinancialAlert[]>([]);

    ngOnInit() {
        this.api.getFinancialAlerts().subscribe({
            next: (res) => this.alerts.set(res.alerts),
            error: () => this.alerts.set([]),
        });
    }

    message(a: FinancialAlert): string {
        const cat = this.i18n.categoryLabel(a.category);
        if (a.kind === 'over_budget') return this.t('alerts.overBudget', { cat, pct: Math.round(a.percent_used ?? 0) });
        if (a.kind === 'near_limit') return this.t('alerts.nearLimit', { cat, pct: Math.round(a.percent_used ?? 0) });
        return this.t('alerts.anomaly', { cat, ratio: (a.ratio ?? 0).toFixed(1) });
    }
}
