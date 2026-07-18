import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, PublicGoal } from '../../core/services/api.service';
import { I18nService } from '../../i18n/i18n.service';
import { templateOf } from '../goals/goal-templates';

/** EUR-base → display, matching CurrencyService/app-amount rates. */
const RATES: Record<string, { rate: number; locale: string }> = {
    EUR: { rate: 1, locale: 'fr-FR' },
    XOF: { rate: 655.957, locale: 'fr-FR' },
    USD: { rate: 1.08, locale: 'en-US' },
};

/**
 * Public, read-only view of a shared savings goal — no login required.
 * Someone's family opens /g/<token> and sees only the goal's progress
 * (name, image, %, amounts) and a gentle invite to Omaad. Nothing else.
 */
@Component({
    selector: 'app-public-goal',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col items-center justify-center px-4 py-10">
            @if (loading()) {
                <i class="pi pi-spin pi-spinner text-3xl text-surface-300"></i>
            } @else if (notFound()) {
                <div class="text-center max-w-sm">
                    <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                        <i class="pi pi-link text-2xl text-surface-400"></i>
                    </div>
                    <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('publicGoal.notFoundTitle') }}</h1>
                    <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('publicGoal.notFoundDesc') }}</p>
                </div>
            } @else if (goal()) {
              @if (goal(); as g) {
                <div class="w-full max-w-md bg-surface-0 dark:bg-surface-900 rounded-3xl overflow-hidden shadow-xl border border-surface-200 dark:border-surface-800">
                    <!-- Hero image -->
                    <div class="relative h-44 bg-brand-900">
                        <img [src]="heroImage()" alt="" class="w-full h-full object-cover" (error)="imgError.set(true)" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div class="absolute bottom-0 left-0 right-0 p-5">
                            @if (g.owner_name) {
                                <p class="text-white/70 text-xs font-medium mb-0.5">{{ t('publicGoal.sharedBy') }} {{ g.owner_name }}</p>
                            }
                            <h1 class="text-white text-xl font-bold leading-tight">{{ g.name }}</h1>
                        </div>
                    </div>

                    <!-- Progress -->
                    <div class="p-6">
                        <div class="flex items-end justify-between mb-2">
                            <span class="text-3xl font-black text-brand-700 dark:text-brand-300 tabular-nums">{{ g.progress_percentage | number:'1.0-0' }}%</span>
                            @if (g.is_completed) {
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-positive/10 text-positive text-xs font-semibold">
                                    <i class="pi pi-check-circle text-xs"></i>{{ t('publicGoal.reached') }}
                                </span>
                            }
                        </div>
                        <div class="h-2.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden mb-3">
                            <div class="h-full bg-brand-700 dark:bg-brand-300 rounded-full transition-all duration-700"
                                 [style.width]="barWidth() + '%'"></div>
                        </div>
                        <p class="text-sm text-surface-600 dark:text-surface-400">
                            <span class="font-semibold text-surface-900 dark:text-surface-0">{{ money(g.current_amount) }}</span>
                            {{ t('publicGoal.of') }} {{ money(g.target_amount) }}
                        </p>
                        @if (g.target_date) {
                            <p class="text-xs text-surface-400 mt-1">{{ t('publicGoal.by') }} {{ prettyDate(g.target_date) }}</p>
                        }
                    </div>

                    <!-- Gentle Omaad invite -->
                    <a [routerLink]="['/']" class="block px-6 py-4 border-t border-surface-100 dark:border-surface-800 text-center hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <span class="text-xs text-surface-500 dark:text-surface-400">{{ t('publicGoal.poweredBy') }}</span>
                        <span class="text-sm font-bold text-brand-700 dark:text-ochre-400 ml-1">Omaad</span>
                    </a>
                </div>
              }
            }
        </div>
    `
})
export class PublicGoalPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private api = inject(ApiService);
    private i18n = inject(I18nService);

    loading = signal(true);
    notFound = signal(false);
    goal = signal<PublicGoal | null>(null);
    imgError = signal(false);

    t(key: string): string { return this.i18n.t(key); }

    barWidth = computed(() => Math.min(100, Math.max(0, this.goal()?.progress_percentage ?? 0)));

    heroImage = computed(() => {
        const g = this.goal();
        if (!g) return '';
        if (!this.imgError() && g.image_url) return g.image_url;
        return templateOf(g.template_key).imageFull;
    });

    async ngOnInit() {
        const token = this.route.snapshot.paramMap.get('token') ?? '';
        try {
            this.goal.set(await firstValueFrom(this.api.getPublicGoal(token)));
        } catch {
            this.notFound.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    /** Convert EUR-base amount to the owner's currency, matching the app. */
    money(eur: number): string {
        const g = this.goal();
        const cfg = RATES[g?.currency ?? 'EUR'] ?? RATES['EUR'];
        const val = Math.round((eur ?? 0) * cfg.rate);
        return `${new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 0 }).format(val)} ${g?.currency_symbol ?? ''}`.trim();
    }

    prettyDate(iso: string): string {
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
}
