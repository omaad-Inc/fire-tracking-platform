import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService } from '../../../i18n/i18n.service';

interface FaqEntry {
    id: string;
    question: string;
    answer: string;       // Plain text; supports \n for paragraph breaks
}

interface FaqCategory {
    id: string;
    label: string;
    entries: FaqEntry[];
}

@Component({
    selector: 'app-faq',
    standalone: true,
    imports: [CommonModule, RouterModule, RippleModule, TopbarWidget, FooterWidget],
    template: `
        <div class="bg-surface-0 min-h-screen">
            <!-- Topbar -->
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 backdrop-blur-lg border-b border-surface-200/50"
                 style="padding-top: env(safe-area-inset-top, 0px)">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>

            <main class="pt-32 pb-24 px-6 md:px-12 lg:px-20 max-w-5xl mx-auto">

                <!-- Hero -->
                <header class="mb-12 text-center max-w-2xl mx-auto">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ochre-100 border border-ochre-200 text-ochre-700 text-xs font-semibold uppercase tracking-wider mb-4">
                        <i class="pi pi-question-circle text-[10px]"></i>
                        {{ isFr() ? 'Aide & FAQ' : 'Help & FAQ' }}
                    </span>
                    <h1 class="text-4xl md:text-5xl font-bold text-surface-900 mb-4 tracking-tight">
                        {{ isFr() ? 'Questions fréquentes' : 'Frequently asked questions' }}
                    </h1>
                    <p class="text-lg text-surface-600 leading-relaxed">
                        {{ isFr()
                            ? 'Tout ce qu\\'il faut savoir sur Omaad, la BRVM, FIRE Africa et la sécurité de vos données.'
                            : 'Everything you need to know about Omaad, the BRVM, FIRE Africa, and your data security.' }}
                    </p>
                </header>

                <!-- Category chips -->
                <div class="flex flex-wrap gap-2 justify-center mb-10">
                    <button (click)="selectedCategory.set(null)" pRipple
                            class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                            [ngClass]="selectedCategory() === null
                                ? 'bg-brand-700 text-white'
                                : 'bg-surface-100 text-surface-700 hover:bg-surface-200'">
                        {{ isFr() ? 'Toutes' : 'All' }}
                    </button>
                    @for (cat of categories(); track cat.id) {
                        <button (click)="selectedCategory.set(cat.id)" pRipple
                                class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                                [ngClass]="selectedCategory() === cat.id
                                    ? 'bg-brand-700 text-white'
                                    : 'bg-surface-100 text-surface-700 hover:bg-surface-200'">
                            {{ cat.label }}
                        </button>
                    }
                </div>

                <!-- Categories with entries -->
                @for (cat of visibleCategories(); track cat.id) {
                    <section class="mb-10">
                        <h2 class="text-2xl font-bold text-surface-900 mb-5">{{ cat.label }}</h2>
                        <div class="space-y-3">
                            @for (q of cat.entries; track q.id) {
                                <div class="rounded-2xl border border-surface-200 bg-surface-0 overflow-hidden transition-all"
                                     [ngClass]="{ 'shadow-md': isOpen(q.id) }">
                                    <button (click)="toggle(q.id)" pRipple
                                            class="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-50 transition-colors">
                                        <span class="font-semibold text-surface-900">{{ q.question }}</span>
                                        <i class="pi pi-chevron-down text-surface-400 text-xs transition-transform shrink-0"
                                           [class.rotate-180]="isOpen(q.id)"></i>
                                    </button>
                                    @if (isOpen(q.id)) {
                                        <div class="px-5 pb-5 pt-1 text-surface-700 leading-relaxed whitespace-pre-line">{{ q.answer }}</div>
                                    }
                                </div>
                            }
                        </div>
                    </section>
                }

                <!-- Still have a question -->
                <div class="mt-16 p-8 rounded-2xl bg-brand-900 text-center">
                    <h2 class="text-xl font-bold text-white mb-2">
                        {{ isFr() ? 'Une question sans réponse ?' : 'A question we missed?' }}
                    </h2>
                    <p class="text-brand-200 mb-5">
                        {{ isFr()
                            ? 'Écrivez-nous, on répond personnellement à chaque message.'
                            : 'Write to us — every message gets a personal reply.' }}
                    </p>
                    <a href="mailto:contact@omaad.africa"
                       class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ochre-500 hover:bg-ochre-400 text-warm-900 font-semibold transition-all">
                        <i class="pi pi-envelope text-xs"></i>
                        contact&#64;omaad.africa
                    </a>
                </div>
            </main>

            <footer-widget />
        </div>
    `
})
export class FaqPage {
    private i18n = inject(I18nService);
    private router = inject(Router);

    selectedCategory = signal<string | null>(null);
    private openIds = signal<Set<string>>(new Set());

    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    readonly categories = computed<FaqCategory[]>(() => {
        const fr = this.isFr();
        return [
            {
                id: 'product',
                label: fr ? 'Produit' : 'Product',
                entries: [
                    {
                        id: 'p1',
                        question: fr ? 'Qu\'est-ce que Omaad exactement ?' : 'What exactly is Omaad?',
                        answer: fr
                            ? 'Omaad est une application de gestion patrimoniale pensée pour la diaspora africaine et les investisseurs UEMOA. Elle te permet de centraliser tes actifs (BRVM, immobilier, comptes bancaires, tontine, mobile money) en FCFA et en euros, dans un seul tableau de bord.'
                            : 'Omaad is a wealth management app designed for the African diaspora and UEMOA investors. It centralizes your assets (BRVM, real estate, bank accounts, tontine, mobile money) across FCFA and EUR in a single dashboard.',
                    },
                    {
                        id: 'p2',
                        question: fr ? 'Quels actifs puis-je suivre ?' : 'What assets can I track?',
                        answer: fr
                            ? 'Comptes bancaires (FCFA & EUR), actions BRVM, actions internationales (Europe, ETF), obligations, cryptomonnaies, immobilier, livrets d\'épargne, assurance-vie, tontines, mobile money (Wave, Orange Money...), et tout autre actif.'
                            : 'Bank accounts (FCFA & EUR), BRVM stocks, international stocks (Europe, ETFs), bonds, cryptocurrencies, real estate, savings accounts, life insurance, tontines, mobile money (Wave, Orange Money...), and any other asset.',
                    },
                    {
                        id: 'p3',
                        question: fr ? 'Faut-il connecter ses comptes bancaires ?' : 'Do I need to connect my bank accounts?',
                        answer: fr
                            ? 'Non. Tu peux ajouter tes actifs manuellement. La connexion automatique aux courtiers BRVM (Jokko FI, CGF Bourse, Bridge Securities) et aux banques européennes est en cours d\'intégration.'
                            : 'No. You can add your assets manually. Automatic connection to BRVM brokers (Jokko FI, CGF Bourse, Bridge Securities) and European banks is being integrated.',
                    },
                    {
                        id: 'p4',
                        question: fr ? 'Omaad fonctionne-t-il sur mobile ?' : 'Does Omaad work on mobile?',
                        answer: fr
                            ? 'Oui. Omaad est une PWA — tu peux l\'installer sur ton téléphone depuis le navigateur, sans passer par l\'App Store ou le Play Store. L\'expérience est optimisée pour mobile et desktop.'
                            : 'Yes. Omaad is a PWA — you can install it on your phone directly from your browser, no App Store or Play Store needed. The experience is optimized for both mobile and desktop.',
                    },
                ],
            },
            {
                id: 'pricing',
                label: fr ? 'Tarifs' : 'Pricing',
                entries: [
                    {
                        id: 'pr1',
                        question: fr ? 'Omaad est-il gratuit ?' : 'Is Omaad free?',
                        answer: fr
                            ? 'Oui. Le plan Gratuit reste gratuit pour toujours — actifs illimités, suivi des transactions, objectifs d\'épargne, gestion des dettes. Les plans Pro et Premium ajoutent des fonctionnalités avancées (rapports automatiques, alertes, synchronisation bancaire) mais ne sont pas obligatoires.'
                            : 'Yes. The Free plan stays free forever — unlimited assets, transaction tracking, savings goals, debt management. Pro and Premium plans add advanced features (automated reports, alerts, bank sync) but are not required.',
                    },
                    {
                        id: 'pr2',
                        question: fr ? 'Quelle est la différence entre Pro et Premium ?' : 'What\'s the difference between Pro and Premium?',
                        answer: fr
                            ? 'Pro inclut les rapports hebdomadaires automatiques, l\'export CSV/PDF, les alertes personnalisées et le support prioritaire. Premium ajoute un conseiller dédié, la synchronisation bancaire automatique, l\'analyse fiscale multi-pays et les rapports personnalisés illimités.'
                            : 'Pro includes automated weekly reports, CSV/PDF export, custom alerts, and priority support. Premium adds a dedicated advisor, automatic bank sync, multi-country tax analysis, and unlimited custom reports.',
                    },
                    {
                        id: 'pr3',
                        question: fr ? 'Puis-je payer à l\'année ?' : 'Can I pay annually?',
                        answer: fr
                            ? 'Oui. Le paiement annuel offre une remise de 33 % par rapport au mensuel. Tu peux basculer entre mensuel et annuel à tout moment depuis ton espace.'
                            : 'Yes. Annual billing offers a 33% discount over monthly. You can switch between monthly and annual at any time from your account.',
                    },
                ],
            },
            {
                id: 'security',
                label: fr ? 'Sécurité & données' : 'Security & data',
                entries: [
                    {
                        id: 's1',
                        question: fr ? 'Mes données sont-elles en sécurité ?' : 'Is my data safe?',
                        answer: fr
                            ? 'Toutes les données sensibles (identifiants courtiers, mots de passe) sont chiffrées en AES-256 avant stockage. Nous n\'avons jamais accès à tes mots de passe en clair. Les serveurs sont hébergés dans l\'UE (région Europe), avec sauvegardes chiffrées.'
                            : 'All sensitive data (broker credentials, passwords) is encrypted with AES-256 before storage. We never access your passwords in plain text. Servers are hosted in the EU (Europe region) with encrypted backups.',
                    },
                    {
                        id: 's2',
                        question: fr ? 'Omaad vend-il mes données ?' : 'Does Omaad sell my data?',
                        answer: fr
                            ? 'Jamais. Nous ne vendons, ne louons ni ne partageons tes données avec des tiers à des fins commerciales. Notre modèle économique repose sur les abonnements payants, pas sur la publicité.'
                            : 'Never. We do not sell, rent, or share your data with third parties for commercial purposes. Our business model is based on paid subscriptions, not advertising.',
                    },
                    {
                        id: 's3',
                        question: fr ? 'Puis-je supprimer mon compte ?' : 'Can I delete my account?',
                        answer: fr
                            ? 'Oui, à tout moment depuis tes paramètres. Toutes tes données sont effacées dans les 30 jours conformément au RGPD. Tu peux aussi demander un export complet de tes données avant suppression.'
                            : 'Yes, anytime from your settings. All your data is erased within 30 days as per GDPR. You can also request a full export of your data before deletion.',
                    },
                ],
            },
            {
                id: 'fire',
                label: fr ? 'FIRE & BRVM' : 'FIRE & BRVM',
                entries: [
                    {
                        id: 'f1',
                        question: fr ? 'C\'est quoi le mouvement FIRE ?' : 'What is the FIRE movement?',
                        answer: fr
                            ? 'FIRE (Financial Independence, Retire Early) est un mouvement né aux États-Unis dans les années 1990. L\'idée : quand tes revenus passifs couvrent tes dépenses, tu es libre — peu importe ton âge. La newsletter FIRE Africa adapte ces principes à la réalité de la diaspora africaine et de l\'UEMOA.'
                            : 'FIRE (Financial Independence, Retire Early) is a movement born in the US in the 1990s. The idea: when your passive income covers your expenses, you are free — regardless of age. The FIRE Africa newsletter adapts these principles to the African diaspora and UEMOA reality.',
                    },
                    {
                        id: 'f2',
                        question: fr ? 'C\'est quoi la BRVM ?' : 'What is the BRVM?',
                        answer: fr
                            ? 'La Bourse Régionale des Valeurs Mobilières (BRVM) est la bourse commune aux 8 pays de l\'UEMOA (Bénin, Burkina Faso, Côte d\'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo). Elle a son siège à Abidjan et compte une cinquantaine de sociétés cotées.'
                            : 'The Bourse Régionale des Valeurs Mobilières (BRVM) is the shared stock exchange of the 8 UEMOA countries (Benin, Burkina Faso, Côte d\'Ivoire, Guinea-Bissau, Mali, Niger, Senegal, Togo). It is headquartered in Abidjan and lists around fifty companies.',
                    },
                    {
                        id: 'f3',
                        question: fr ? 'Quand FIRE Africa sera-t-il lancé publiquement ?' : 'When will FIRE Africa launch publicly?',
                        answer: fr
                            ? 'La newsletter FIRE Africa sera lancée publiquement le 1er juin 2026 sur Beehiiv. 15 éditions sont déjà rédigées en draft. Tu peux t\'inscrire dès maintenant sur fireafrica.beehiiv.com pour être notifié au lancement.'
                            : 'The FIRE Africa newsletter will launch publicly on June 1, 2026 on Beehiiv. 15 editions are already drafted. You can subscribe now at fireafrica.beehiiv.com to be notified at launch.',
                    },
                ],
            },
        ];
    });

    readonly visibleCategories = computed(() => {
        const sel = this.selectedCategory();
        if (!sel) return this.categories();
        return this.categories().filter(c => c.id === sel);
    });

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = match ? match[1] : 'fr';
        this.i18n.setLang(lang as 'fr' | 'en');
    }

    isOpen(id: string): boolean {
        return this.openIds().has(id);
    }

    toggle(id: string): void {
        this.openIds.update(set => {
            const next = new Set(set);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }
}
