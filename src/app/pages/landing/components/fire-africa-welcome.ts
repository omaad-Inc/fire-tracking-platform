import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'app-fire-africa-welcome',
    standalone: true,
    imports: [RouterModule, ButtonModule, RippleModule],
    template: `
        <div class="min-h-screen flex items-center justify-center bg-brand-900 px-6 py-12 relative overflow-hidden">

            <!-- Background glow effects -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden">
                <div class="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full opacity-15"
                     style="background: radial-gradient(circle, #C77B3C 0%, transparent 70%)"></div>
                <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-10"
                     style="background: radial-gradient(circle, #1A2740 0%, transparent 70%)"></div>
            </div>

            <div class="relative max-w-lg w-full text-center">

                <!-- Fire icon -->
                <div class="mb-6">
                    <div class="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
                         style="background: linear-gradient(135deg, #C77B3C 0%, #AB6630 100%);">
                        <span class="text-4xl">🔥</span>
                    </div>
                </div>

                <!-- Heading -->
                <h1 class="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
                    style="color: #FAF8F4;">
                    {{ isFr ? 'Bienvenue chez' : 'Welcome to' }}<br>
                    <span style="color: #C77B3C;">FIRE Africa</span>
                </h1>

                <!-- Confirmation -->
                <p class="text-lg mb-8 leading-relaxed" style="color: #8A98AE;">
                    {{ isFr
                        ? 'Ton inscription est confirmée. Première édition : 1er juin 2026.'
                        : 'Your subscription is confirmed. First edition: June 1, 2026.' }}
                </p>

                <!-- Ochre accent line -->
                <div class="flex justify-center mb-8">
                    <div class="w-16 h-0.5 rounded-full" style="background-color: #C77B3C;"></div>
                </div>

                <!-- Omaad pitch -->
                <div class="rounded-2xl px-8 py-6 mb-10 text-left"
                     style="background-color: rgba(26, 39, 64, 0.6); border: 1px solid rgba(138, 152, 174, 0.15);">
                    <p class="text-base leading-relaxed" style="color: #C2BDB1;">
                        {{ isFr
                            ? 'En attendant, découvre Omaad — la plateforme de gestion patrimoniale pensée pour la diaspora africaine et la zone UEMOA. Patrimoine, épargne, FIRE, multi-devises FCFA/EUR — tout dans un seul tableau de bord.'
                            : 'In the meantime, discover Omaad — the wealth management platform built for the African diaspora and the WAEMU zone. Assets, savings, FIRE, multi-currency FCFA/EUR — all in one dashboard.' }}
                    </p>
                </div>

                <!-- CTA Buttons -->
                <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                    <a href="https://omaad.africa" target="_blank" pButton pRipple
                       class="!font-semibold !rounded-xl !px-8 !py-3.5 !text-base !border-0 !text-white
                              inline-flex items-center justify-center gap-2"
                       style="background: linear-gradient(135deg, #C77B3C 0%, #AB6630 100%);">
                        <i class="pi pi-external-link text-sm"></i>
                        {{ isFr ? 'Découvrir Omaad' : 'Discover Omaad' }}
                    </a>
                    <a href="https://www.linkedin.com/company/omaad" target="_blank" pButton pRipple
                       class="!font-semibold !rounded-xl !px-8 !py-3.5 !text-base
                              inline-flex items-center justify-center gap-2"
                       style="background: transparent; border: 1.5px solid rgba(138, 152, 174, 0.3); color: #8A98AE;">
                        <i class="pi pi-linkedin text-sm"></i>
                        {{ isFr ? 'Suivre sur LinkedIn' : 'Follow on LinkedIn' }}
                    </a>
                </div>

                <!-- Brand footer -->
                <div class="flex flex-col items-center gap-3 opacity-60">
                    <img src="assets/brand/omaad-icon-inverse.svg" alt="Omaad" class="w-10 h-10">
                    <span class="text-sm font-semibold tracking-wide" style="color: #C77B3C;">
                        Construis. Protège. Règne.
                    </span>
                </div>

            </div>
        </div>
    `
})
export class FireAfricaWelcome {
    private router = inject(Router);

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    get isFr(): boolean {
        return this.currentLang === '/fr';
    }
}
