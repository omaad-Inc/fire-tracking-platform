import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { PhoneFrame } from './phoneframe';
import { RevealDirective } from './reveal.directive';

/**
 * Trust and data (landing redesign): five statements that are all true,
 * in plain words, plus the publisher line. No hosting-location claim until
 * the regions are confirmed; no "zéro tracking" next to first-party events.
 */
@Component({
    selector: 'trust-widget',
    standalone: true,
    imports: [PhoneFrame, RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section id="securite" class="lp-section-tight scroll-mt-16" [attr.aria-labelledby]="'trust-title'">
            <div class="lp-container">
                <div class="lp-card p-6 sm:p-10 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center" lpReveal>
                    <div class="lg:col-span-7">
                        <span class="lp-eyebrow">{{ t('landing.trust.eyebrow') }}</span>
                        <h2 id="trust-title" class="lp-h2 mt-3">{{ t('landing.trust.h2') }}</h2>
                        <p class="lp-lead mt-3">{{ t('landing.trust.lead') }}</p>
                        <ul class="mt-7 flex flex-col gap-4 list-none p-0 m-0">
                            @for (n of [1, 2, 3, 4, 5]; track n) {
                                <li class="flex items-start gap-3">
                                    <span class="lp-icon-tile !w-10 !h-10 !rounded-xl text-[15px]"><i class="pi" [class]="icons[n - 1]" aria-hidden="true"></i></span>
                                    <span class="lp-body pt-2">{{ t('landing.trust.t' + n) }}</span>
                                </li>
                            }
                        </ul>
                        <p class="mt-7 text-[14px] lp-muted">{{ t('landing.trust.company') }}</p>
                    </div>
                    <div class="lg:col-span-5 hidden sm:block">
                        <div class="relative mx-auto w-[min(60%,260px)] lg:w-[280px]">
                            <lp-phone [src]="'assets/marketing/securite.webp'" [alt]="t('landing.trust.phoneAlt')" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `,
})
export class TrustWidget {
    private i18n = inject(I18nService);
    readonly icons = ['pi-ban', 'pi-key', 'pi-lock', 'pi-eye-slash', 'pi-download'];
    t(key: string): string { return this.i18n.t(key); }
}
