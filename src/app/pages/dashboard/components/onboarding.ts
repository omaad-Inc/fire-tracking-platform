import { Component, inject, computed, input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TokenService } from '../../../core/services/token.service';
import { I18nService } from '../../../i18n/i18n.service';

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
        <div class="card !p-0 overflow-hidden mb-12 sm:mb-8">
            <!-- Header with gradient -->
            <div class="bg-brand-900 px-6 py-8 sm:px-8 sm:py-10 text-center relative overflow-hidden">
                <!-- Background decoration -->
                <div class="absolute top-0 right-0 w-40 h-40 bg-ochre-500/15 rounded-full blur-3xl"></div>
                <div class="absolute bottom-0 left-0 w-32 h-32 bg-brand-300/10 rounded-full blur-3xl"></div>

                <div class="relative">
                    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                        <span class="w-2 h-2 rounded-full bg-ochre-400 animate-pulse"></span>
                        <span class="text-white/80 text-xs font-medium">
                            {{ isFr() ? 'Bienvenue sur Omaad' : 'Welcome to Omaad' }}
                        </span>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-bold text-white mb-2">
                        {{ isFr() ? 'Bonjour' : 'Hello' }} {{ firstName() }} !
                    </h2>
                    <p class="text-brand-100 text-sm sm:text-base max-w-md mx-auto">
                        {{ isFr()
                            ? 'Construis. Protège. Règne. — Commencez par ces 3 étapes pour prendre le contrôle de votre patrimoine.'
                            : 'Build. Protect. Reign. — Start with these 3 steps to take control of your wealth.' }}
                    </p>
                </div>
            </div>

            <!-- Steps -->
            <div class="p-5 sm:p-8">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    @for (step of steps(); track step.title; let i = $index) {
                        <div class="relative flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer group"
                             [ngClass]="completedSteps().has(i)
                                 ? 'border-positive-100 dark:border-positive-700/40 bg-positive-50 dark:bg-positive-700/10'
                                 : 'border-surface-200 dark:border-surface-700 hover:border-brand-200 dark:hover:border-brand-700 hover:bg-brand-50/40 dark:hover:bg-brand-900/20'"
                             (click)="step.action()">

                            <!-- Step number badge -->
                            <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                 [ngClass]="completedSteps().has(i)
                                     ? 'bg-positive text-white'
                                     : 'bg-brand-700 dark:bg-brand-300 text-white dark:text-brand-900'">
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
                                <span class="text-xs font-semibold text-brand-700 dark:text-brand-300 group-hover:text-brand-500 dark:group-hover:text-brand-200 transition-colors">
                                    {{ step.cta }} <i class="pi pi-arrow-right text-[10px] ml-0.5"></i>
                                </span>
                            } @else {
                                <span class="text-xs font-semibold text-positive">
                                    {{ isFr() ? 'Fait !' : 'Done !' }}
                                </span>
                            }
                        </div>
                    }
                </div>

                <!-- Dismiss -->
                <div class="flex justify-center mt-6">
                    <button (click)="dismiss()"
                            class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 text-xs transition-colors cursor-pointer">
                        {{ isFr() ? 'Masquer ce guide' : 'Hide this guide' }}
                    </button>
                </div>
            </div>
        </div>
    `
})
export class OnboardingComponent {
    private router       = inject(Router);
    private tokenService = inject(TokenService);
    private i18n         = inject(I18nService);

    hasAssets       = input<boolean>(false);
    hasTransactions = input<boolean>(false);
    hasFireGoal     = input<boolean>(false);

    @Output() addAsset  = new EventEmitter<void>();
    @Output() dismissed = new EventEmitter<void>();

    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    completedSteps = computed(() => {
        const set = new Set<number>();
        if (this.hasAssets())       set.add(0);
        if (this.hasTransactions()) set.add(1);
        if (this.hasFireGoal())     set.add(2);
        return set;
    });

    firstName = () => {
        const user = this.tokenService.user();
        return user?.first_name || user?.email?.split('@')[0] || '';
    };

    private get lang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return match ? match[1] : 'fr';
    }

    steps = computed<OnboardingStep[]>(() => {
        const fr = this.isFr();
        return [
            {
                icon: 'pi-plus',
                iconBg: 'bg-brand-700 dark:bg-brand-300',
                title: fr ? 'Ajoutez un actif'      : 'Add an asset',
                desc:  fr ? 'Immobilier, épargne, actions, tontine — commencez par ajouter votre premier actif.'
                          : 'Real estate, savings, stocks, tontine — start by adding your first asset.',
                cta:   fr ? 'Ajouter'               : 'Add',
                action: () => this.addAsset.emit(),
            },
            {
                icon: 'pi-arrow-right-arrow-left',
                iconBg: 'bg-brand-700 dark:bg-brand-300',
                title: fr ? 'Enregistrez une transaction' : 'Record a transaction',
                desc:  fr ? 'Salaire, loyer, courses — suivez vos revenus et dépenses.'
                          : 'Salary, rent, groceries — track your income and expenses.',
                cta:   fr ? 'Commencer'                   : 'Start',
                action: () => this.router.navigate(['/', this.lang, 'pages', 'transaction']),
            },
            {
                icon: 'pi-flag',
                iconBg: 'bg-ochre-500',
                title: fr ? 'Définissez votre objectif' : 'Set your goal',
                desc:  fr ? 'Configurez votre objectif FIRE pour savoir où vous allez.'
                          : 'Configure your FIRE goal so you know where you\'re heading.',
                cta:   fr ? 'Configurer'                : 'Configure',
                action: () => this.router.navigate(['/', this.lang, 'pages', 'fire']),
            },
        ];
    });

    dismiss() {
        localStorage.setItem('omaad_onboarding_dismissed', 'true');
        this.dismissed.emit();
    }
}
