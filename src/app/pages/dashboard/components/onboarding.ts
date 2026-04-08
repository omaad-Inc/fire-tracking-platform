import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TokenService } from '../../../core/services/token.service';

interface OnboardingStep {
    icon: string;
    iconBg: string;
    title: string;
    desc: string;
    cta: string;
    action: () => void;
}

@Component({
    selector: 'app-onboarding',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule],
    template: `
        <div class="card !p-0 overflow-hidden mb-6">
            <!-- Header with gradient -->
            <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 px-6 py-8 sm:px-8 sm:py-10 text-center relative overflow-hidden">
                <!-- Background decoration -->
                <div class="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
                <div class="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-3xl"></div>

                <div class="relative">
                    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span class="text-white/80 text-xs font-medium">Bienvenue sur Omaad</span>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Bonjour {{ firstName() }} !
                    </h2>
                    <p class="text-indigo-200 text-sm sm:text-base max-w-md mx-auto">
                        Construis. Protège. Règne. — Commencez par ces 3 étapes pour prendre le contrôle de votre patrimoine.
                    </p>
                </div>
            </div>

            <!-- Steps -->
            <div class="p-5 sm:p-8">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    @for (step of steps; track step.title; let i = $index) {
                        <div class="relative flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer group"
                             [ngClass]="completedSteps().has(i)
                                 ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20'
                                 : 'border-surface-200 dark:border-surface-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10'"
                             (click)="step.action()">

                            <!-- Step number badge -->
                            <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                 [ngClass]="completedSteps().has(i)
                                     ? 'bg-emerald-500 text-white'
                                     : 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white'">
                                @if (completedSteps().has(i)) {
                                    <i class="pi pi-check text-[10px]"></i>
                                } @else {
                                    {{ i + 1 }}
                                }
                            </div>

                            <!-- Icon -->
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mt-1 {{ step.iconBg }} group-hover:scale-110 transition-transform">
                                <i class="pi {{ step.icon }} text-xl text-white"></i>
                            </div>

                            <h3 class="font-semibold text-surface-900 dark:text-surface-0 text-sm mb-1">{{ step.title }}</h3>
                            <p class="text-surface-500 dark:text-surface-400 text-xs leading-relaxed mb-3">{{ step.desc }}</p>

                            @if (!completedSteps().has(i)) {
                                <span class="text-xs font-semibold text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                    {{ step.cta }} <i class="pi pi-arrow-right text-[10px] ml-0.5"></i>
                                </span>
                            } @else {
                                <span class="text-xs font-semibold text-emerald-500">Fait !</span>
                            }
                        </div>
                    }
                </div>

                <!-- Dismiss -->
                <div class="flex justify-center mt-6">
                    <button (click)="dismiss()"
                            class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 text-xs transition-colors cursor-pointer">
                        Masquer ce guide
                    </button>
                </div>
            </div>
        </div>
    `
})
export class OnboardingComponent {
    private router       = inject(Router);
    private tokenService = inject(TokenService);

    @Output() addAsset       = new EventEmitter<void>();
    @Output() dismissed      = new EventEmitter<void>();

    completedSteps = signal(new Set<number>());

    firstName = () => {
        const user = this.tokenService.user();
        return user?.first_name || user?.email?.split('@')[0] || '';
    };

    private get lang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return match ? match[1] : 'fr';
    }

    steps: OnboardingStep[] = [
        {
            icon: 'pi-plus',
            iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
            title: 'Ajoutez un actif',
            desc: 'Immobilier, épargne, actions, tontine — commencez par ajouter votre premier actif.',
            cta: 'Ajouter',
            action: () => this.addAsset.emit(),
        },
        {
            icon: 'pi-arrow-right-arrow-left',
            iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
            title: 'Enregistrez une transaction',
            desc: 'Salaire, loyer, courses — suivez vos revenus et dépenses.',
            cta: 'Commencer',
            action: () => this.router.navigate(['/', this.lang, 'pages', 'transaction']),
        },
        {
            icon: 'pi-flag',
            iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            title: 'Définissez votre objectif',
            desc: 'Configurez votre objectif FIRE pour savoir où vous allez.',
            cta: 'Configurer',
            action: () => this.router.navigate(['/', this.lang, 'pages', 'settings', 'fire']),
        },
    ];

    dismiss() {
        localStorage.setItem('omaad_onboarding_dismissed', 'true');
        this.dismissed.emit();
    }
}
