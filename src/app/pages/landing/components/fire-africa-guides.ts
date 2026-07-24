import { Component, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { I18nService, type Lang } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';

@Component({
    selector: 'app-fire-africa-guides',
    standalone: true,
    imports: [RouterModule, ButtonModule, RippleModule],
    template: `
        <div class="min-h-screen flex items-center justify-center bg-brand-900 px-6 py-12 relative overflow-hidden">

            <!-- Background glow -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden">
                <div class="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-ochre-500/10 blur-3xl"></div>
            </div>

            <div class="relative max-w-lg w-full text-center">

                <!-- Fire icon -->
                <div class="mb-6">
                    <div class="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-ochre-500">
                        <span class="text-4xl">🔥</span>
                    </div>
                </div>

                <!-- Heading -->
                <h1 class="text-3xl sm:text-4xl font-bold mb-4 leading-tight text-white">
                    {{ t('fireGuides.titleLine1') }}<br>
                    <span class="text-ochre-400">{{ t('fireGuides.titleLine2') }}</span>
                </h1>

                <p class="text-lg mb-8 leading-relaxed text-brand-200">
                    {{ t('fireGuides.intro') }}
                </p>

                <!-- Ochre accent line -->
                <div class="flex justify-center mb-8">
                    <div class="w-16 h-0.5 rounded-full bg-ochre-500"></div>
                </div>

                <!-- Tome 1 -->
                <div id="tome-1" class="rounded-2xl px-8 py-6 mb-5 text-left bg-brand-800/60 border border-brand-700/40">
                    <h2 class="text-lg font-semibold mb-1 text-white">{{ t('fireGuides.tome1Title') }}</h2>
                    <p class="text-base leading-relaxed mb-4 text-surface-300">{{ t('fireGuides.tome1Desc') }}</p>
                    <a href="/guides/fire-africa-tome1-core-satellite.pdf" download pButton pRipple
                       class="!font-semibold !rounded-xl !px-6 !py-3 !text-base !border-0 !bg-ochre-500 hover:!bg-ochre-400 !text-warm-900
                              inline-flex items-center justify-center gap-2 w-full sm:w-auto">
                        <i class="pi pi-download text-sm"></i>
                        {{ t('fireGuides.tome1Cta') }}
                    </a>
                </div>

                <!-- Tome 2 -->
                <div id="tome-2" class="rounded-2xl px-8 py-6 mb-8 text-left bg-brand-800/60 border border-brand-700/40">
                    <h2 class="text-lg font-semibold mb-1 text-white">{{ t('fireGuides.tome2Title') }}</h2>
                    <p class="text-base leading-relaxed mb-4 text-surface-300">{{ t('fireGuides.tome2Desc') }}</p>
                    <a href="/guides/fire-africa-tome2-mode-emploi-brvm.pdf" download pButton pRipple
                       class="!font-semibold !rounded-xl !px-6 !py-3 !text-base !border-0 !bg-ochre-500 hover:!bg-ochre-400 !text-warm-900
                              inline-flex items-center justify-center gap-2 w-full sm:w-auto">
                        <i class="pi pi-download text-sm"></i>
                        {{ t('fireGuides.tome2Cta') }}
                    </a>
                </div>

                <p class="text-sm mb-10 text-brand-200">
                    👉 {{ t('fireGuides.startTip') }}
                </p>

                <!-- Cross-sell -->
                <div class="rounded-2xl px-8 py-6 mb-10 text-left bg-brand-800/60 border border-brand-700/40">
                    <h2 class="text-base font-semibold mb-3 text-white">{{ t('fireGuides.moreTitle') }}</h2>
                    <ul class="space-y-2 text-base text-surface-300">
                        <li>
                            <a routerLink="/outils/comparateur-sgi-brvm" class="text-ochre-400 hover:text-ochre-300 font-medium">{{ t('fireGuides.sgiLink') }}</a>{{ t('fireGuides.sgiDesc') }}
                        </li>
                        <li>
                            <a [routerLink]="[currentLang, 'blog']" class="text-ochre-400 hover:text-ochre-300 font-medium">{{ t('fireGuides.blogLink') }}</a>{{ t('fireGuides.blogDesc') }}
                        </li>
                        <li>
                            <a [routerLink]="[currentLang, 'auth', 'register']" class="text-ochre-400 hover:text-ochre-300 font-medium">{{ t('fireGuides.appLink') }}</a>{{ t('fireGuides.appDesc') }}
                        </li>
                    </ul>
                </div>

                <!-- Brand footer -->
                <div class="flex flex-col items-center gap-3 opacity-60">
                    <img src="assets/brand/omaad-icon-inverse.svg" alt="Omaad" class="w-10 h-10">
                    <span class="text-sm font-semibold tracking-wide text-ochre-400">
                        Construis. Protège. Règne.
                    </span>
                </div>

            </div>
        </div>
    `
})
export class FireAfricaGuides implements OnDestroy {
    private router = inject(Router);
    private seo = inject(SeoService);
    private i18n = inject(I18nService);

    currentLang = '/fr';

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        // Sync i18n with the URL language (the email links straight here).
        this.i18n.setLang(lang);
        this.seo.applyLocalized({ lang, ...SEO_PAGES.fireAfricaGuides });
        // Lead magnet : offert en échange de l'inscription à la newsletter, ne
        // doit pas être trouvable via Google (absent du sitemap aussi, voir
        // tools/generate-prerender-routes.mjs).
        this.seo.setRobots('noindex');
    }

    ngOnDestroy(): void {
        this.seo.removeRobots();
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
