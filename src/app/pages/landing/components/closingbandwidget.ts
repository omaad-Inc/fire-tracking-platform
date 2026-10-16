import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService } from '../../../i18n/i18n.service';
import { RevealDirective } from './reveal.directive';

/** The one dark moment of the page: a navy band with the final action (landing redesign). */
@Component({
    selector: 'closing-band-widget',
    standalone: true,
    imports: [RouterModule, RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="lp-dark py-16 lg:py-24" [attr.aria-labelledby]="'closing-title'">
            <div class="lp-container text-center" lpReveal>
                <h2 id="closing-title" class="lp-h2 !text-white">{{ t('landing.closing.h2') }}</h2>
                <p class="lp-lead mt-4 !text-white/75 max-w-[36rem] mx-auto">{{ t('landing.closing.lead') }}</p>
                <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                    <a class="lp-btn lp-btn-primary lp-btn-block sm:w-auto" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('closing_register')">
                        {{ t('landing.closing.cta') }}
                    </a>
                </div>
                <p class="mt-5 text-[14px] text-white/60">{{ t('landing.closing.steps') }}</p>
            </div>
        </section>
    `,
})
export class ClosingBandWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private analytics = inject(AnalyticsService);

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    trackCta(placement: string): void {
        this.analytics.trackPublic('cta_click', { cta: placement, placement, lang: this.currentLang.replace(/^\//, '') });
    }
}
