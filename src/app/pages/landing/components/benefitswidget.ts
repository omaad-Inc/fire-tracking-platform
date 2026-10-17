import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { RevealDirective } from './reveal.directive';

/** Three reasons a spreadsheet or a European app does not fit (landing redesign). */
@Component({
    selector: 'benefits-widget',
    standalone: true,
    imports: [RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section id="features" class="lp-section-tight scroll-mt-16" [attr.aria-labelledby]="'benefits-title'">
            <div class="lp-container">
                <div class="max-w-[40rem] text-center lg:text-left mx-auto lg:mx-0" lpReveal>
                    <span class="lp-eyebrow">{{ t('landing.benefits.eyebrow') }}</span>
                    <h2 id="benefits-title" class="lp-h2 mt-3">{{ t('landing.benefits.h2') }}</h2>
                </div>
                <div class="mt-8 lg:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    @for (b of items; track b.key) {
                        <div class="lp-card p-6 lg:p-7" lpReveal>
                            <span class="lp-icon-tile"><i class="pi" [class]="b.icon" aria-hidden="true"></i></span>
                            <h3 class="lp-h3 mt-5">{{ t('landing.benefits.' + b.key + 'Title') }}</h3>
                            <p class="lp-body mt-2">{{ t('landing.benefits.' + b.key + 'Desc') }}</p>
                        </div>
                    }
                </div>
            </div>
        </section>
    `,
})
export class BenefitsWidget {
    private i18n = inject(I18nService);
    readonly items = [
        { key: 'b1', icon: 'pi-globe' },
        { key: 'b2', icon: 'pi-chart-line' },
        { key: 'b3', icon: 'pi-flag' },
    ];
    t(key: string): string { return this.i18n.t(key); }
}
