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
                    {{ isFr ? 'Bienvenue chez' : 'Welcome to' }}<br>
                    <span class="text-ochre-400">FIRE Africa</span>
                </h1>

                <!-- Confirmation -->
                <p class="text-lg mb-8 leading-relaxed text-brand-200">
                    {{ isFr
                        ? 'Ton inscription est confirmée. Tu recevras la prochaine édition directement dans ta boîte mail.'
                        : 'Your subscription is confirmed. You will receive the next edition straight to your inbox.' }}
                </p>

                <!-- Ochre accent line -->
                <div class="flex justify-center mb-8">
                    <div class="w-16 h-0.5 rounded-full bg-ochre-500"></div>
                </div>

                <!-- Beta teaser -->
                <div class="rounded-2xl px-8 py-6 mb-10 text-left bg-brand-800/60 border border-brand-700/40">
                    <p class="text-base leading-relaxed text-surface-300">
                        {{ isFr
                            ? 'On construit aussi une plateforme de gestion patrimoniale pour la diaspora africaine et la zone UEMOA. La bêta privée arrive bientôt — les abonnés FIRE Africa seront les premiers informés.'
                            : 'We are also building a wealth management platform for the African diaspora and the WAEMU zone. Private beta is coming soon — FIRE Africa subscribers will be the first to know.' }}
                    </p>
                </div>

                <!-- CTA Button -->
                <div class="flex justify-center mb-12">
                    <a href="https://www.linkedin.com/company/omaad" target="_blank" pButton pRipple
                       class="!font-semibold !rounded-xl !px-8 !py-3.5 !text-base !border-0 !bg-ochre-500 hover:!bg-ochre-400 !text-warm-900
                              inline-flex items-center justify-center gap-2">
                        <i class="pi pi-linkedin text-sm"></i>
                        {{ isFr ? 'Suivre Omaad sur LinkedIn' : 'Follow Omaad on LinkedIn' }}
                    </a>
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
