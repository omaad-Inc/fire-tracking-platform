import { Component, inject, signal, ElementRef, AfterViewInit, OnDestroy, NgZone, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'social-proof-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <section id="social-proof" class="relative py-16 md:py-20 px-6 lg:px-20 bg-surface-50 dark:bg-surface-950 border-y border-surface-200 dark:border-surface-800 overflow-hidden">
            <div class="relative max-w-6xl mx-auto">
                <!-- Header -->
                <div class="text-center mb-12">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ochre-500/30 dark:border-ochre-400/40 bg-ochre-500/10 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-300 text-sm font-medium mb-5">
                        <i class="pi pi-megaphone text-xs"></i>
                        <span>{{ t('landing.socialProof.eyebrow') }}</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white leading-tight">
                        {{ t('landing.socialProof.h2a') }}
                        <span class="text-brand-700 dark:text-ochre-400">
                            {{ t('landing.socialProof.h2b') }}
                        </span>
                    </h2>
                </div>

                <!-- 4 counters -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    @for (stat of stats; track stat.valueKey) {
                        <div class="text-center group">
                            <div class="text-4xl md:text-5xl font-bold mb-2 tabular-nums"
                                 [class]="stat.highlight
                                    ? 'text-ochre-500 dark:text-ochre-400'
                                    : 'text-brand-700 dark:text-ochre-400'">
                                {{ animated() ? t(stat.valueKey) : ', ' }}
                            </div>
                            <div class="text-sm text-surface-600 dark:text-surface-400 leading-snug max-w-[180px] mx-auto">
                                {{ t(stat.labelKey) }}
                            </div>
                        </div>
                    }
                </div>
            </div>
        </section>
    `
})
export class SocialProofWidget implements AfterViewInit, OnDestroy {
    private i18n = inject(I18nService);
    private el = inject(ElementRef);
    private zone = inject(NgZone);
    private platformId = inject(PLATFORM_ID);
    private observer?: IntersectionObserver;

    animated = signal(false);

    readonly stats = [
        { valueKey: 'landing.socialProof.stat1Value', labelKey: 'landing.socialProof.stat1Label', highlight: false },
        { valueKey: 'landing.socialProof.stat2Value', labelKey: 'landing.socialProof.stat2Label', highlight: false },
        { valueKey: 'landing.socialProof.stat3Value', labelKey: 'landing.socialProof.stat3Label', highlight: false },
        { valueKey: 'landing.socialProof.stat4Value', labelKey: 'landing.socialProof.stat4Label', highlight: true },
    ];

    t(key: string): string { return this.i18n.t(key); }

    ngAfterViewInit(): void {
        // During prerender/SSR there is no IntersectionObserver; render the
        // final (animated-in) state so crawlers get the stats in the HTML.
        if (!isPlatformBrowser(this.platformId)) {
            this.animated.set(true);
            return;
        }
        this.zone.runOutsideAngular(() => {
            this.observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        this.zone.run(() => this.animated.set(true));
                        this.observer?.disconnect();
                    }
                },
                { threshold: 0.3 }
            );
            this.observer.observe(this.el.nativeElement);
        });
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();
    }
}
