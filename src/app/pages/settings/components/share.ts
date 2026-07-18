import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, PortfolioShareInfo } from '../../../core/services/api.service';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Settings → "Bilan partageable": create and manage read-only portfolio
 * shares. The owner picks anonymized (default) / identified, an optional
 * educational-content consent (which forces anonymization), and a 7/30-day
 * expiry. Existing shares can be copied, refreshed or revoked.
 */
@Component({
    selector: 'app-share-settings',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="max-w-2xl">
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">{{ t('portfolioShare.subtitle') }}</p>

            <!-- New share -->
            <section class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 mb-8">
                <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-4">{{ t('portfolioShare.optionsTitle') }}</h3>

                <!-- Anonymize -->
                <button type="button" (click)="toggleAnon()" [disabled]="allowContent()"
                        class="w-full flex items-start gap-3 text-left mb-4 disabled:opacity-60">
                    <span class="mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors relative"
                          [class.bg-brand-600]="anonymized()" [class.bg-surface-300]="!anonymized()"
                          [class.dark:bg-surface-600]="!anonymized()">
                        <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                              [class.translate-x-4]="anonymized()"></span>
                    </span>
                    <span class="flex-1 min-w-0">
                        <span class="block text-sm font-medium text-surface-900 dark:text-surface-0">{{ t('portfolioShare.anonymize') }}</span>
                        <span class="block text-xs text-surface-500 dark:text-surface-400">{{ t('portfolioShare.anonymizeHint') }}</span>
                    </span>
                </button>

                <!-- Allow content -->
                <button type="button" (click)="toggleContent()"
                        class="w-full flex items-start gap-3 text-left mb-4">
                    <span class="mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors relative"
                          [class.bg-brand-600]="allowContent()" [class.bg-surface-300]="!allowContent()"
                          [class.dark:bg-surface-600]="!allowContent()">
                        <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                              [class.translate-x-4]="allowContent()"></span>
                    </span>
                    <span class="flex-1 min-w-0">
                        <span class="block text-sm font-medium text-surface-900 dark:text-surface-0">{{ t('portfolioShare.allowContent') }}</span>
                        <span class="block text-xs text-surface-500 dark:text-surface-400">{{ t('portfolioShare.allowContentHint') }}</span>
                        @if (allowContent()) {
                            <span class="block text-xs text-ochre-600 dark:text-ochre-400 mt-1">{{ t('portfolioShare.allowContentForcesAnon') }}</span>
                        }
                    </span>
                </button>

                <!-- Expiry -->
                <div class="mb-5">
                    <span class="block text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">{{ t('portfolioShare.expiry') }}</span>
                    <div class="inline-flex rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                        <button type="button" (click)="expiry.set(7)"
                                class="px-4 py-2 text-sm font-medium transition-colors"
                                [class.bg-brand-600]="expiry() === 7" [class.text-white]="expiry() === 7"
                                [class.text-surface-600]="expiry() !== 7" [class.dark:text-surface-300]="expiry() !== 7">
                            {{ t('portfolioShare.days7') }}
                        </button>
                        <button type="button" (click)="expiry.set(30)"
                                class="px-4 py-2 text-sm font-medium transition-colors border-l border-surface-200 dark:border-surface-700"
                                [class.bg-brand-600]="expiry() === 30" [class.text-white]="expiry() === 30"
                                [class.text-surface-600]="expiry() !== 30" [class.dark:text-surface-300]="expiry() !== 30">
                            {{ t('portfolioShare.days30') }}
                        </button>
                    </div>
                </div>

                <button type="button" (click)="generate()" [disabled]="creating()"
                        class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    @if (creating()) { <i class="pi pi-spin pi-spinner text-sm"></i> {{ t('portfolioShare.generating') }} }
                    @else { <i class="pi pi-share-alt text-sm"></i> {{ t('portfolioShare.generate') }} }
                </button>

                <p class="text-xs text-surface-400 dark:text-surface-500 mt-3 flex items-start gap-1.5">
                    <i class="pi pi-lock text-xs mt-0.5"></i><span>{{ t('portfolioShare.viewerNote') }}</span>
                </p>
                @if (feedback()) {
                    <p class="text-xs text-positive mt-2">{{ feedback() }}</p>
                }
                @if (errorMsg()) {
                    <p class="text-xs text-negative mt-2">{{ errorMsg() }}</p>
                }
            </section>

            <!-- Existing shares -->
            <h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3 px-1">{{ t('portfolioShare.yourShares') }}</h3>
            @if (loading()) {
                <div class="py-8 text-center"><i class="pi pi-spin pi-spinner text-2xl text-surface-300"></i></div>
            } @else if (shares().length === 0) {
                <p class="text-sm text-surface-400 dark:text-surface-500 px-1 py-4">{{ t('portfolioShare.noShares') }}</p>
            } @else {
                <div class="space-y-3">
                    @for (s of shares(); track s.id) {
                        <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                      [ngClass]="statusClass(s.status)">
                                    <span class="w-1.5 h-1.5 rounded-full" [ngClass]="statusDot(s.status)"></span>
                                    {{ statusLabel(s.status) }}
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                    {{ s.anonymized ? t('portfolioShare.anonymizedBadge') : t('portfolioShare.identifiedBadge') }}
                                </span>
                                @if (s.allow_content) {
                                    <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-ochre-100 dark:bg-ochre-900/30 text-ochre-700 dark:text-ochre-400">{{ t('portfolioShare.contentBadge') }}</span>
                                }
                                <span class="ml-auto text-xs text-surface-400">{{ t('portfolioShare.views', { count: s.view_count }) }}</span>
                            </div>

                            <div class="flex items-center gap-2 mb-2">
                                <input readonly [value]="fullUrl(s)" (click)="selectAll($event)"
                                       class="flex-1 min-w-0 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-surface-600 dark:text-surface-300 truncate" />
                                <button type="button" (click)="copy(s)" [disabled]="s.status !== 'active'"
                                        class="shrink-0 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
                                    {{ copiedId() === s.id ? t('portfolioShare.copied') : t('portfolioShare.copy') }}
                                </button>
                            </div>

                            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-400">
                                <span>{{ t('portfolioShare.expiresOn') }} {{ prettyDate(s.expires_at) }}</span>
                                <div class="ml-auto flex items-center gap-3">
                                    <button type="button" (click)="refresh(s)" [disabled]="s.status !== 'active' || busyId() === s.id"
                                            class="inline-flex items-center gap-1 text-brand-600 dark:text-ochre-400 hover:underline disabled:opacity-40 disabled:no-underline"
                                            [title]="t('portfolioShare.refreshHint')">
                                        <i class="pi pi-refresh text-xs"></i>{{ t('portfolioShare.refresh') }}
                                    </button>
                                    <button type="button" (click)="revoke(s)" [disabled]="s.status === 'revoked' || busyId() === s.id"
                                            class="inline-flex items-center gap-1 text-negative hover:underline disabled:opacity-40 disabled:no-underline">
                                        <i class="pi pi-times-circle text-xs"></i>{{ t('portfolioShare.revoke') }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class ShareSettings implements OnInit {
    private api = inject(ApiService);
    private i18n = inject(I18nService);

    anonymized = signal(true);
    allowContent = signal(false);
    expiry = signal<7 | 30>(7);

    creating = signal(false);
    loading = signal(true);
    shares = signal<PortfolioShareInfo[]>([]);
    copiedId = signal<number | null>(null);
    busyId = signal<number | null>(null);
    feedback = signal('');
    errorMsg = signal('');

    lang = computed(() => this.i18n.lang());

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    ngOnInit() { this.load(); }

    private load() {
        this.loading.set(true);
        this.api.listPortfolioShares().subscribe({
            next: s => { this.shares.set(s); this.loading.set(false); },
            error: () => { this.loading.set(false); },
        });
    }

    toggleAnon() {
        if (this.allowContent()) return;         // content shares are locked anonymized
        this.anonymized.update(v => !v);
    }

    toggleContent() {
        const next = !this.allowContent();
        this.allowContent.set(next);
        if (next) this.anonymized.set(true);      // force anonymized on
    }

    generate() {
        this.creating.set(true);
        this.feedback.set('');
        this.errorMsg.set('');
        this.api.createPortfolioShare({
            anonymized: this.anonymized(),
            allow_content: this.allowContent(),
            expires_in_days: this.expiry(),
        }).subscribe({
            next: share => {
                this.creating.set(false);
                this.shares.update(list => [share, ...list]);
                this.feedback.set(this.t('portfolioShare.created'));
                // Auto-copy the fresh link for convenience.
                this.copy(share);
            },
            error: () => { this.creating.set(false); this.errorMsg.set(this.t('portfolioShare.error')); },
        });
    }

    fullUrl(s: PortfolioShareInfo): string {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/${this.lang()}${s.share_path}`;
    }

    copy(s: PortfolioShareInfo) {
        navigator.clipboard?.writeText(this.fullUrl(s)).then(() => {
            this.copiedId.set(s.id);
            setTimeout(() => this.copiedId.set(null), 2000);
        }).catch(() => {});
    }

    selectAll(e: Event) { (e.target as HTMLInputElement).select(); }

    refresh(s: PortfolioShareInfo) {
        this.busyId.set(s.id);
        this.errorMsg.set('');
        this.api.refreshPortfolioShare(s.id).subscribe({
            next: updated => {
                this.busyId.set(null);
                this.shares.update(list => list.map(x => x.id === updated.id ? updated : x));
                this.feedback.set(this.t('portfolioShare.refreshed'));
            },
            error: () => { this.busyId.set(null); this.errorMsg.set(this.t('portfolioShare.error')); },
        });
    }

    revoke(s: PortfolioShareInfo) {
        if (!confirm(this.t('portfolioShare.revokeConfirm'))) return;
        this.busyId.set(s.id);
        this.errorMsg.set('');
        this.api.revokePortfolioShare(s.id).subscribe({
            next: () => {
                this.busyId.set(null);
                this.shares.update(list => list.map(x => x.id === s.id
                    ? { ...x, status: 'revoked' as const, revoked_at: new Date().toISOString() }
                    : x));
                this.feedback.set(this.t('portfolioShare.revoked'));
            },
            error: () => { this.busyId.set(null); this.errorMsg.set(this.t('portfolioShare.error')); },
        });
    }

    statusLabel(s: string): string {
        return this.t(s === 'active' ? 'portfolioShare.statusActive'
            : s === 'expired' ? 'portfolioShare.statusExpired'
            : 'portfolioShare.statusRevoked');
    }
    statusClass(s: string): string {
        return s === 'active' ? 'bg-positive/10 text-positive'
            : s === 'expired' ? 'bg-surface-100 dark:bg-surface-800 text-surface-500'
            : 'bg-negative-50 dark:bg-negative-700/20 text-negative';
    }
    statusDot(s: string): string {
        return s === 'active' ? 'bg-positive' : s === 'expired' ? 'bg-surface-400' : 'bg-negative';
    }

    prettyDate(iso: string): string {
        const locale = this.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    }
}
