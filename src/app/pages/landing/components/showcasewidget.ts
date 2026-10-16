import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService } from '../../../i18n/i18n.service';
import { PhoneFrame } from './phoneframe';
import { RevealDirective } from './reveal.directive';

/**
 * Four feature showcases (landing redesign): text + three check bullets +
 * one feature-specific action, next to the REAL screen of that feature.
 * Alternating sides on desktop, stacked on phones. Replaces the five
 * icon cards, the wealth-score mock, the highlights and the quote.
 */
@Component({
    selector: 'showcase-widget',
    standalone: true,
    imports: [RouterModule, PhoneFrame, RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="lp-section" [attr.aria-label]="t('landing.showcase.sectionAria')">
            <div class="lp-container flex flex-col gap-16 lg:gap-28">
                @for (f of items; track f.key; let odd = $odd) {
                    <article class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center" lpReveal>
                        <div class="lg:col-span-6" [class.lg:order-2]="odd">
                            <span class="lp-eyebrow">{{ t('landing.showcase.' + f.key + 'Eyebrow') }}</span>
                            <h3 class="lp-h2 text-[26px] lg:text-[36px] mt-3">{{ t('landing.showcase.' + f.key + 'Title') }}</h3>
                            <p class="lp-lead mt-4">{{ t('landing.showcase.' + f.key + 'Desc') }}</p>
                            <ul class="mt-6 flex flex-col gap-3 list-none p-0 m-0">
                                @for (n of [1, 2, 3]; track n) {
                                    <li class="flex items-start gap-3 lp-body">
                                        <span class="lp-check mt-0.5"><i class="pi pi-check" aria-hidden="true"></i></span>
                                        <span>{{ t('landing.showcase.' + f.key + 'I' + n) }}</span>
                                    </li>
                                }
                            </ul>
                            @if (f.note) {
                                <p class="mt-4 text-[13px] lp-muted">{{ t('landing.showcase.' + f.key + 'Note') }}</p>
                            }
                            <a class="lp-link mt-5" [routerLink]="[currentLang, 'auth', 'register']" [queryParams]="{ intent: f.intent }" (click)="trackCta('feature_' + f.intent)">
                                {{ t('landing.showcase.' + f.key + 'Cta') }}
                                <i class="pi pi-arrow-right text-[12px]" aria-hidden="true"></i>
                            </a>
                        </div>
                        <div class="lg:col-span-6" [class.lg:order-1]="odd">
                            <div class="relative mx-auto w-[min(62%,280px)] lg:w-[320px]">
                                <div class="lp-glow opacity-70" aria-hidden="true"></div>
                                <lp-phone [src]="'assets/marketing/' + f.file" [alt]="t('landing.showcase.' + f.key + 'Alt')" />
                            </div>
                        </div>
                    </article>
                }
            </div>
        </section>
    `,
})
export class ShowcaseWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private analytics = inject(AnalyticsService);

    readonly items = [
        { key: 'f1', file: 'marches.webp', intent: 'brvm', note: false },
        { key: 'f2', file: 'transactions.webp', intent: 'budget', note: false },
        { key: 'f3', file: 'dettes.webp', intent: 'goal', note: false },
        { key: 'f4', file: 'assistant.webp', intent: 'assistant', note: true },
    ];

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    trackCta(placement: string): void {
        this.analytics.trackPublic('cta_click', { cta: placement, placement, lang: this.currentLang.replace(/^\//, '') });
    }
}
