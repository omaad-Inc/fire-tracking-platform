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
import { I18nService } from '../../../i18n/i18n.service';

interface FaqItem {
    questionKey: string;
    answerKey: string;
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
            <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5">
                <h2 class="relative text-xl font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ i18n.t('help.title') }}</h2>
                <p class="relative text-sm text-surface-500 dark:text-surface-400 mb-4">{{ i18n.t('help.subtitle') }}</p>
                <div class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"></i>
                    <input pInputText [(ngModel)]="searchQuery" [placeholder]="i18n.t('help.searchPlaceholder')"
                           class="w-full !pl-10 !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                </div>
            </div>

            <!-- ── Quick links ───────────────────────────────────── -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                @for (link of quickLinks; track link.label) {
                    <button (click)="searchQuery = link.tag"
                            class="flex flex-col items-center gap-2 p-4 rounded-2xl border border-surface-200 dark:border-surface-700
                                   hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/40 dark:hover:bg-brand-900/20
                                   transition-all text-center group">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center {{ link.bg }}">
                            <i class="pi {{ link.icon }} {{ link.color }} text-lg"></i>
                        </div>
                        <span class="text-xs font-medium text-surface-700 dark:text-surface-200 leading-tight">{{ link.label }}</span>
                    </button>
                }
            </div>

            <!-- ── FAQ ──────────────────────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                        <i class="pi pi-question-circle text-brand-700 dark:text-brand-300"></i>
                    </div>
                    <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('help.faqTitle') }}</h2>
                </div>

                <div class="divide-y divide-surface-100 dark:divide-surface-700/50">
                    @for (item of filteredFaq(); track item.questionKey) {
                        <div class="px-5">
                            <button (click)="item.open = !item.open"
                                    class="w-full flex items-center justify-between py-4 text-left group">
                                <span class="font-medium text-surface-900 dark:text-surface-0 text-sm pr-4 group-hover:text-ochre-600 dark:group-hover:text-ochre-400 transition-colors">
                                    {{ i18n.t(item.questionKey) }}
                                </span>
                                <i class="pi shrink-0 transition-transform duration-200 text-surface-400"
                                   [ngClass]="item.open ? 'pi-chevron-up text-brand-700 dark:text-brand-300' : 'pi-chevron-down'"></i>
                            </button>
                            @if (item.open) {
                                <div class="pb-4 text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                                    {{ i18n.t(item.answerKey) }}
                                </div>
                            }
                        </div>
                    }
                    @if (filteredFaq().length === 0) {
                        <div class="px-5 py-8 text-center text-surface-500 dark:text-surface-400 text-sm">
                            {{ i18n.t('help.noResults', { query: searchQuery }) }}
                        </div>
                    }
                </div>
            </section>

            <!-- ── Contact ──────────────────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                        <i class="pi pi-envelope text-brand-700 dark:text-brand-300"></i>
                    </div>
                    <div>
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('help.contactTitle') }}</h2>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 m-0">{{ i18n.t('help.responseTime') }}</p>
                    </div>
                </div>

                <div class="p-5">
                    <div class="flex flex-col gap-6">
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('help.subject') }}</label>
                            <input pInputText [(ngModel)]="contactForm.subject"
                                   [placeholder]="i18n.t('help.subjectPlaceholder')"
                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('help.message') }}</label>
                            <textarea pTextarea [(ngModel)]="contactForm.message" rows="4"
                                      [placeholder]="i18n.t('help.messagePlaceholder')"
                                      class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 resize-none"></textarea>
                        </div>
                        <div class="flex items-center justify-between gap-4 flex-wrap">
                            <p class="text-xs text-surface-400 flex items-center gap-1.5">
                                <i class="pi pi-shield text-brand-700 dark:text-brand-300"></i>
                                {{ i18n.t('help.dataConfidential') }}
                            </p>
                            <p-button [label]="i18n.t('help.sendMessage')" icon="pi pi-send"
                                      [loading]="isSending()"
                                      [disabled]="!contactForm.subject || !contactForm.message"
                                      (click)="sendMessage()"
                                      styleClass="omaad-cta !rounded-full" />
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Other resources ──────────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-positive/10 flex items-center justify-center shrink-0">
                        <i class="pi pi-link text-positive"></i>
                    </div>
                    <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('help.resourcesTitle') }}</h2>
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
                    Omaad Wealth · v{{ appVersion }}
                </p>
            </div>
        </div>
    `
})
export class HelpSettings {
    private http = inject(HttpClient);
    private tokenService = inject(TokenService);
    private messageService = inject(MessageService);
    i18n = inject(I18nService);
    appVersion = environment.version;

    searchQuery = '';
    isSending   = signal(false);
    contactForm = { subject: '', message: '' };

    get quickLinks() {
        return [
            { label: this.i18n.t('help.quickLinks.account'),  tag: this.i18n.t('help.quickTags.account'),  icon: 'pi-user',   color: 'text-brand-700 dark:text-brand-300', bg: 'bg-brand-700/10 dark:bg-brand-300/15' },
            { label: this.i18n.t('help.quickLinks.currency'), tag: this.i18n.t('help.quickTags.currency'), icon: 'pi-wallet', color: 'text-brand-700 dark:text-brand-300', bg: 'bg-brand-700/10 dark:bg-brand-300/15' },
            { label: this.i18n.t('help.quickLinks.fire'),     tag: this.i18n.t('help.quickTags.fire'),     icon: 'pi-flag',   color: 'text-positive', bg: 'bg-positive/10' },
            { label: this.i18n.t('help.quickLinks.security'), tag: this.i18n.t('help.quickTags.security'), icon: 'pi-shield', color: 'text-ochre-500', bg: 'bg-ochre-100' },
        ];
    }

    get resources() {
        return [
            {
                label: this.i18n.t('help.resources.helpCenterLabel'),
                desc:  this.i18n.t('help.resources.helpCenterDesc'),
                url:   'https://help.omaad.app',
                icon:  'pi-book',  color: 'text-brand-700 dark:text-brand-300', bg: 'bg-brand-700/10 dark:bg-brand-300/15',
            },
            {
                label: this.i18n.t('help.resources.reportBugLabel'),
                desc:  this.i18n.t('help.resources.reportBugDesc'),
                url:   'https://github.com/omaad-wealth/feedback/issues',
                icon:  'pi-github', color: 'text-surface-500', bg: 'bg-surface-500/10',
            },
            {
                label: this.i18n.t('help.resources.swrLabel'),
                desc:  this.i18n.t('help.resources.swrDesc'),
                url:   'https://www.investopedia.com/terms/f/four-percent-rule.asp',
                icon:  'pi-percentage', color: 'text-positive', bg: 'bg-positive/10',
            },
        ];
    }

    // Q&A text lives in i18n (help.faq.*); this array only holds the keys +
    // per-item accordion state, so `open` survives change detection.
    readonly faqItems: FaqItem[] = Array.from({ length: 10 }, (_, i) => ({
        questionKey: `help.faq.q${i + 1}`,
        answerKey:   `help.faq.a${i + 1}`,
        open: false,
    }));

    filteredFaq() {
        const q = this.searchQuery.toLowerCase().trim();
        if (!q) return this.faqItems;
        return this.faqItems.filter(f =>
            this.i18n.t(f.questionKey).toLowerCase().includes(q) ||
            this.i18n.t(f.answerKey).toLowerCase().includes(q)
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
                    summary: this.i18n.t('help.sendSuccessTitle'),
                    detail: this.i18n.t('help.sendSuccessDetail'),
                    life: 5000
                });
                this.contactForm = { subject: '', message: '' };
            },
            error: () => {
                this.isSending.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: this.i18n.t('common.error'),
                    detail: this.i18n.t('help.sendErrorDetail'),
                    life: 5000
                });
            }
        });
    }
}
