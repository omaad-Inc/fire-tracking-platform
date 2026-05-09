import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { TokenService } from '../../../core/services/token.service';

interface FaqItem {
    question: string;
    answer: string;
    open: boolean;
}

@Component({
    selector: 'app-settings-help',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TextareaModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center" />

        <div class="flex flex-col gap-5">

            <!-- ── Search bar ────────────────────────────────────── -->
            <div class="card !p-5">
                <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 mb-1">Comment pouvons-nous vous aider ?</h2>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-4">Parcourez les questions fréquentes ou contactez notre équipe.</p>
                <div class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"></i>
                    <input pInputText [(ngModel)]="searchQuery" placeholder="Rechercher une question..."
                           class="w-full !pl-10 !py-3 !rounded-xl" />
                </div>
            </div>

            <!-- ── Quick links ───────────────────────────────────── -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                @for (link of quickLinks; track link.label) {
                    <button (click)="searchQuery = link.tag"
                            class="flex flex-col items-center gap-2 p-4 rounded-2xl border border-surface-200 dark:border-surface-700
                                   hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/40 dark:hover:bg-brand-900/20
                                   transition-all text-center group">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center {{ link.bg }} group-hover:scale-110 transition-transform">
                            <i class="pi {{ link.icon }} {{ link.color }} text-lg"></i>
                        </div>
                        <span class="text-xs font-medium text-surface-700 dark:text-surface-200 leading-tight">{{ link.label }}</span>
                    </button>
                }
            </div>

            <!-- ── FAQ ──────────────────────────────────────────── -->
            <section class="card !p-0 overflow-hidden">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                        <i class="pi pi-question-circle text-brand-700 dark:text-brand-300"></i>
                    </div>
                    <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Questions fréquentes</h2>
                </div>

                <div class="divide-y divide-surface-100 dark:divide-surface-700/50">
                    @for (item of filteredFaq(); track item.question) {
                        <div class="px-5">
                            <button (click)="item.open = !item.open"
                                    class="w-full flex items-center justify-between py-4 text-left group">
                                <span class="font-medium text-surface-900 dark:text-surface-0 text-sm pr-4 group-hover:text-ochre-600 dark:group-hover:text-ochre-400 transition-colors">
                                    {{ item.question }}
                                </span>
                                <i class="pi shrink-0 transition-transform duration-200 text-surface-400"
                                   [ngClass]="item.open ? 'pi-chevron-up text-brand-700 dark:text-brand-300' : 'pi-chevron-down'"></i>
                            </button>
                            @if (item.open) {
                                <div class="pb-4 text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                                    {{ item.answer }}
                                </div>
                            }
                        </div>
                    }
                    @if (filteredFaq().length === 0) {
                        <div class="px-5 py-8 text-center text-surface-500 dark:text-surface-400 text-sm">
                            Aucun résultat pour "{{ searchQuery }}". Essayez d'autres mots-clés.
                        </div>
                    }
                </div>
            </section>

            <!-- ── Contact ──────────────────────────────────────── -->
            <section class="card !p-0 overflow-hidden">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                        <i class="pi pi-envelope text-brand-700 dark:text-brand-300"></i>
                    </div>
                    <div>
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Nous contacter</h2>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 m-0">Réponse sous 24–48 h</p>
                    </div>
                </div>

                <div class="p-5">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-medium text-surface-700 dark:text-surface-300">Sujet</label>
                            <input pInputText [(ngModel)]="contactForm.subject"
                                   placeholder="Ex : Problème de connexion, question sur les devises…"
                                   class="w-full !py-3 !rounded-xl" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-medium text-surface-700 dark:text-surface-300">Message</label>
                            <textarea pTextarea [(ngModel)]="contactForm.message" rows="4"
                                      placeholder="Décrivez votre problème ou question en détail…"
                                      class="w-full !rounded-xl resize-none"></textarea>
                        </div>
                        <div class="flex items-center justify-between gap-4 flex-wrap">
                            <p class="text-xs text-surface-400 flex items-center gap-1.5">
                                <i class="pi pi-shield text-brand-700 dark:text-brand-300"></i>
                                Vos données restent confidentielles.
                            </p>
                            <p-button label="Envoyer le message" icon="pi pi-send"
                                      [loading]="isSending()"
                                      [disabled]="!contactForm.subject || !contactForm.message"
                                      (click)="sendMessage()"
                                      styleClass="omaad-cta !rounded-xl" />
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Other resources ──────────────────────────────── -->
            <section class="card !p-0 overflow-hidden">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-positive/10 flex items-center justify-center shrink-0">
                        <i class="pi pi-link text-positive"></i>
                    </div>
                    <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Ressources utiles</h2>
                </div>
                <div class="divide-y divide-surface-100 dark:divide-surface-700/50">
                    @for (res of resources; track res.label) {
                        <a [href]="res.url" target="_blank"
                           class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group">
                            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 {{ res.bg }}">
                                <i class="pi {{ res.icon }} {{ res.color }}"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-surface-900 dark:text-surface-0 group-hover:text-ochre-600 dark:group-hover:text-ochre-400 transition-colors">{{ res.label }}</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400">{{ res.desc }}</p>
                            </div>
                            <i class="pi pi-external-link text-xs text-surface-400 shrink-0"></i>
                        </a>
                    }
                </div>
            </section>

            <!-- ── Version info ─────────────────────────────────── -->
            <div class="text-center py-2">
                <p class="text-xs text-surface-400 dark:text-surface-500">
                    Omaad Wealth · v1.0.0 · <span class="text-positive">●</span> Opérationnel
                </p>
            </div>
        </div>
    `
})
export class HelpSettings {
    private http = inject(HttpClient);
    private tokenService = inject(TokenService);
    private messageService = inject(MessageService);

    searchQuery = '';
    isSending   = signal(false);
    contactForm = { subject: '', message: '' };

    readonly quickLinks = [
        { label: 'Compte & Profil',  tag: 'compte',    icon: 'pi-user',          color: 'text-brand-700 dark:text-brand-300',  bg: 'bg-brand-700/10 dark:bg-brand-300/15'  },
        { label: 'Devises & FCFA',   tag: 'devise',    icon: 'pi-wallet',        color: 'text-brand-700 dark:text-brand-300',    bg: 'bg-brand-700/10 dark:bg-brand-300/15'    },
        { label: 'Objectif FIRE',    tag: 'fire',      icon: 'pi-flag',          color: 'text-positive', bg: 'bg-positive/10' },
        { label: 'Sécurité',         tag: 'sécurité',  icon: 'pi-shield',        color: 'text-ochre-500',   bg: 'bg-ochre-100'   },
    ];

    readonly resources = [
        {
            label: 'Centre d\'aide en ligne',
            desc:  'Documentation complète et tutoriels vidéo',
            url:   'https://help.omaad.app',
            icon:  'pi-book',  color: 'text-brand-700 dark:text-brand-300', bg: 'bg-brand-700/10 dark:bg-brand-300/15',
        },
        {
            label: 'Signaler un bug',
            desc:  'Aidez-nous à améliorer l\'application',
            url:   'https://github.com/omaad-wealth/feedback/issues',
            icon:  'pi-github', color: 'text-surface-500', bg: 'bg-surface-500/10',
        },
        {
            label: 'Règle des 4% — SWR',
            desc:  'Comprendre la base du calcul FIRE',
            url:   'https://www.investopedia.com/terms/f/four-percent-rule.asp',
            icon:  'pi-percentage', color: 'text-positive', bg: 'bg-positive/10',
        },
    ];

    private readonly faqItems: FaqItem[] = [
        {
            question: 'Comment modifier ma devise d\'affichage ?',
            answer:   'Allez dans Paramètres → Préférences, puis sélectionnez la devise souhaitée (FCFA, EUR ou USD) dans le menu déroulant "Devise". Tous les montants seront immédiatement convertis dans votre nouvelle devise.',
            open: false,
        },
        {
            question: 'Mes données financières sont-elles sécurisées ?',
            answer:   'Oui. Toutes les communications sont chiffrées en SSL/TLS. Vos données sont stockées sur des serveurs sécurisés et ne sont jamais partagées avec des tiers. Vous pouvez supprimer votre compte et toutes vos données à tout moment depuis Paramètres → Mon compte.',
            open: false,
        },
        {
            question: 'Qu\'est-ce que l\'objectif FIRE et comment le configurer ?',
            answer:   'FIRE (Financial Independence, Retire Early) est une méthode qui consiste à épargner un capital suffisant pour vivre de ses revenus passifs. Dans Omaad Wealth, allez dans Paramètres → Objectif Financier, renseignez vos dépenses annuelles et le taux de rendement attendu — l\'application calcule automatiquement le capital cible (basé sur la règle des 4%).',
            open: false,
        },
        {
            question: 'Pourquoi mon patrimoine net est-il négatif ?',
            answer:   'Le patrimoine net = total des actifs − total des dettes. Si vos dettes (prêt immobilier, crédit auto…) dépassent la valeur totale de vos actifs, le résultat est négatif. C\'est normal en début de remboursement d\'un prêt immobilier, par exemple. Il évoluera positivement au fil des remboursements.',
            open: false,
        },
        {
            question: 'Comment ajouter un actif de type Tontine ou Mobile Money ?',
            answer:   'Cliquez sur "Ajouter un actif" dans la barre de navigation, puis sélectionnez "Tontine" ou "Mobile Money" dans la grille de catégories. Un formulaire adapté s\'affichera avec les champs spécifiques à chaque type.',
            open: false,
        },
        {
            question: 'Je me connecte via Google. Puis-je changer mon email ?',
            answer:   'Non directement depuis Omaad Wealth. Votre email est géré par Google. Pour changer l\'email associé, rendez-vous sur myaccount.google.com, modifiez votre email Google, puis reconnectez-vous à Omaad Wealth.',
            open: false,
        },
        {
            question: 'Comment le taux d\'épargne global est-il calculé ?',
            answer:   'Le taux d\'épargne global est la moyenne des taux d\'épargne mensuels sur tous les mois ayant au moins un revenu enregistré. Le taux mensuel = (revenus − dépenses) / revenus × 100. Les mois sans revenu sont exclus du calcul.',
            open: false,
        },
        {
            question: 'L\'application fonctionne-t-elle hors ligne ?',
            answer:   'Omaad Wealth est une Progressive Web App (PWA). L\'interface s\'affiche hors ligne grâce au cache du navigateur, mais la création et modification de données nécessite une connexion internet pour synchroniser avec le serveur.',
            open: false,
        },
        {
            question: 'Le plan gratuit a-t-il des limites ?',
            answer:   'Non pour les fonctionnalités principales : actifs illimités, transactions illimitées, objectifs d\'épargne, dettes, graphiques et objectif FIRE. Les fonctionnalités avancées (export CSV/PDF, alertes personnalisées, rapports automatiques) seront réservées au plan Pro.',
            open: false,
        },
        {
            question: 'Comment supprimer définitivement mon compte ?',
            answer:   'Allez dans Paramètres → Mon compte → Zone de danger → "Supprimer mon compte". Vous devrez taper le mot SUPPRIMER pour confirmer. Cette action est irréversible et supprime immédiatement toutes vos données.',
            open: false,
        },
    ];

    filteredFaq() {
        const q = this.searchQuery.toLowerCase().trim();
        if (!q) return this.faqItems;
        return this.faqItems.filter(f =>
            f.question.toLowerCase().includes(q) ||
            f.answer.toLowerCase().includes(q)
        );
    }

    sendMessage() {
        if (!this.contactForm.subject || !this.contactForm.message) return;
        this.isSending.set(true);

        const user = this.tokenService.user();
        const payload = {
            fullName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] : 'Utilisateur',
            email: user?.email || 'no-reply@omaad.app',
            company: 'Omaad Wealth (Support)',
            needType: this.contactForm.subject,
            message: this.contactForm.message
        };

        this.http.post(`${environment.apiUrl}/contact`, payload).subscribe({
            next: () => {
                this.isSending.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Message envoyé',
                    detail: 'Nous vous répondrons dans les 24–48 h. Merci !',
                    life: 5000
                });
                this.contactForm = { subject: '', message: '' };
            },
            error: () => {
                this.isSending.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Impossible d\'envoyer le message. Réessayez plus tard.',
                    life: 5000
                });
            }
        });
    }
}
