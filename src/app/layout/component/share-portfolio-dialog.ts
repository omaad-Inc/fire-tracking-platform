import { Component, EventEmitter, Input, Output, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, PortfolioShareInfo } from '../../core/services/api.service';
import { I18nService } from '../../i18n/i18n.service';

const ALL_CATEGORIES = [
    'real_estate', 'stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'cash',
    'savings_account', 'mobile_money', 'retirement', 'life_insurance',
    'business', 'vehicle', 'tontine', 'commodities', 'collectibles', 'other',
];

/**
 * Finary-style "Share your portfolio" dialog (owner side). Two tabs: a public
 * sharing link (category chips + budget / hide-values / code / expiry) and a
 * downloadable Wealth Statement PDF. Opened from the topbar share icon.
 */
@Component({
    selector: 'app-share-portfolio-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        @if (open) {
        <div class="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4" (click)="close.emit()">
            <div class="w-full max-w-2xl bg-surface-0 dark:bg-surface-900 rounded-3xl shadow-2xl my-8 overflow-hidden" (click)="$event.stopPropagation()">
                <!-- Header -->
                <div class="flex items-center justify-between px-6 pt-6 pb-3">
                    <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0">{{ t('shareDialog.title') }}</h2>
                    <button (click)="close.emit()" class="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <i class="pi pi-times text-surface-600 dark:text-surface-300"></i>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="px-6 flex gap-6 border-b border-surface-200 dark:border-surface-800">
                    <button (click)="tab.set('link')" class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
                            [class.border-ochre-500]="tab()==='link'" [class.text-surface-900]="tab()==='link'" [class.dark:text-surface-0]="tab()==='link'"
                            [class.border-transparent]="tab()!=='link'" [class.text-surface-400]="tab()!=='link'">
                        {{ t('shareDialog.tabLink') }}
                    </button>
                    <button (click)="tab.set('pdf')" class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
                            [class.border-ochre-500]="tab()==='pdf'" [class.text-surface-900]="tab()==='pdf'" [class.dark:text-surface-0]="tab()==='pdf'"
                            [class.border-transparent]="tab()!=='pdf'" [class.text-surface-400]="tab()!=='pdf'">
                        {{ t('shareDialog.tabPdf') }}
                    </button>
                </div>

                <div class="p-6">
                @if (tab() === 'link') {
                    <div class="flex gap-3 rounded-2xl border border-surface-200 dark:border-surface-700 p-4 mb-5">
                        <i class="pi pi-info-circle text-surface-400 mt-0.5"></i>
                        <div>
                            <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ t('shareDialog.anonTitle') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('shareDialog.anonDesc') }}</p>
                        </div>
                    </div>

                    <!-- Category chips -->
                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-2">{{ t('shareDialog.categoriesLabel') }}</p>
                    <div class="flex flex-wrap gap-2 mb-5">
                        @for (c of allCategories; track c) {
                            <button (click)="toggleCat(c)"
                                    class="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border"
                                    [ngClass]="isSelected(c)
                                        ? 'bg-brand-50 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 border-brand-300 dark:border-ochre-500/40'
                                        : 'bg-transparent text-surface-500 dark:text-surface-400 border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'">
                                @if (isSelected(c)) { <i class="pi pi-check text-[10px] mr-1"></i> }{{ catLabel(c) }}
                            </button>
                        }
                    </div>

                    <!-- Toggles -->
                    <div class="space-y-3 mb-5">
                        <label class="flex items-center justify-between cursor-pointer">
                            <span class="text-sm text-surface-800 dark:text-surface-100">{{ t('shareDialog.shareBudget') }}</span>
                            <input type="checkbox" [(ngModel)]="shareBudget" class="accent-brand-600 w-5 h-5">
                        </label>
                        <label class="flex items-center justify-between cursor-pointer">
                            <span class="text-sm text-surface-800 dark:text-surface-100">{{ t('shareDialog.hideValues') }}</span>
                            <input type="checkbox" [(ngModel)]="hideValues" class="accent-brand-600 w-5 h-5">
                        </label>
                        <label class="flex items-center justify-between cursor-pointer">
                            <span class="text-sm text-surface-800 dark:text-surface-100">{{ t('shareDialog.protectCode') }}</span>
                            <input type="checkbox" [(ngModel)]="useCode" class="accent-brand-600 w-5 h-5">
                        </label>
                        @if (useCode) {
                            <input [(ngModel)]="code" type="text" [placeholder]="t('shareDialog.codePlaceholder')"
                                   class="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-900 dark:text-surface-0">
                        }
                    </div>

                    <!-- Expiry -->
                    <p class="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">{{ t('shareDialog.expiry') }}</p>
                    <div class="inline-flex rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden mb-6">
                        <button (click)="expiry.set(7)" class="px-4 py-2 text-sm font-medium"
                                [class.bg-brand-600]="expiry()===7" [class.text-white]="expiry()===7">{{ t('shareDialog.expiry7') }}</button>
                        <button (click)="expiry.set(30)" class="px-4 py-2 text-sm font-medium border-l border-surface-200 dark:border-surface-700"
                                [class.bg-brand-600]="expiry()===30" [class.text-white]="expiry()===30">{{ t('shareDialog.expiry30') }}</button>
                    </div>

                    <!-- Generated link -->
                    @if (link()) {
                        <div class="flex items-center gap-2 mb-4">
                            <input readonly [value]="link()" (click)="selectAll($event)"
                                   class="flex-1 min-w-0 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-surface-600 dark:text-surface-300 truncate">
                            <button (click)="copy()" class="shrink-0 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium">
                                {{ copied() ? t('shareDialog.copied') : t('shareDialog.copy') }}
                            </button>
                        </div>
                    }

                    <div class="flex items-center justify-between">
                        @if (current()) {
                            <button (click)="revoke()" [disabled]="busy()"
                                    class="px-5 py-2.5 rounded-xl bg-negative text-white text-sm font-semibold disabled:opacity-60">
                                {{ t('shareDialog.revoke') }}
                            </button>
                        } @else { <span></span> }
                        <button (click)="generate()" [disabled]="busy()"
                                class="px-5 py-2.5 rounded-xl omaad-cta !text-sm !font-semibold disabled:opacity-60">
                            @if (busy()) { <i class="pi pi-spin pi-spinner"></i> } @else { {{ current() ? t('shareDialog.regenerate') : t('shareDialog.generate') }} }
                        </button>
                    </div>
                    @if (error()) { <p class="text-xs text-negative mt-2">{{ t('shareDialog.error') }}</p> }
                } @else {
                    <!-- PDF tab -->
                    <p class="text-sm text-surface-500 dark:text-surface-400 mb-4">{{ t('shareDialog.pdfDescription') }}</p>
                    <button (click)="downloadPdf()" [disabled]="pdfBusy()"
                            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-60">
                        @if (pdfBusy()) { <i class="pi pi-spin pi-spinner"></i> } @else { <i class="pi pi-file-pdf"></i> }
                        {{ t('shareDialog.pdfDownload') }}
                    </button>
                    @if (!current()) { <p class="text-xs text-surface-400 mt-3">{{ t('shareDialog.pdfNeedsLink') }}</p> }
                }
                </div>
            </div>
        </div>
        }
    `,
})
export class SharePortfolioDialog implements OnChanges {
    @Input() open = false;
    @Output() close = new EventEmitter<void>();

    private api = inject(ApiService);
    private i18n = inject(I18nService);

    allCategories = ALL_CATEGORIES;
    tab = signal<'link' | 'pdf'>('link');
    selected = signal<Set<string>>(new Set(ALL_CATEGORIES));
    shareBudget = true;
    hideValues = false;
    useCode = false;
    code = '';
    expiry = signal<7 | 30>(7);

    busy = signal(false);
    pdfBusy = signal(false);
    error = signal(false);
    copied = signal(false);
    current = signal<PortfolioShareInfo | null>(null);
    link = signal('');

    t(k: string) { return this.i18n.t(k); }
    catLabel(c: string) { const l = this.t(`assetCategories.${c}`); return l.startsWith('assetCategories.') ? c : l; }

    ngOnChanges() {
        if (this.open && !this.current()) this.loadExisting();
    }

    private loadExisting() {
        this.api.listPortfolioShares().subscribe(list => {
            const active = list.find(s => s.status === 'active');
            if (active) { this.current.set(active); this.link.set(this.urlFor(active)); }
        });
    }

    isSelected(c: string) { return this.selected().has(c); }
    toggleCat(c: string) {
        const s = new Set(this.selected());
        s.has(c) ? s.delete(c) : s.add(c);
        this.selected.set(s);
    }

    private urlFor(s: PortfolioShareInfo): string {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}${s.share_path}`;
    }

    generate() {
        this.busy.set(true);
        this.error.set(false);
        const sel = this.selected();
        const categories = sel.size === this.allCategories.length ? null : Array.from(sel);
        this.api.createPortfolioShare({
            categories,
            share_budget: this.shareBudget,
            hide_values: this.hideValues,
            access_code: this.useCode && this.code ? this.code : null,
            expires_in_days: this.expiry(),
        }).subscribe({
            next: s => { this.busy.set(false); this.current.set(s); this.link.set(this.urlFor(s)); this.copy(); },
            error: () => { this.busy.set(false); this.error.set(true); },
        });
    }

    revoke() {
        const s = this.current();
        if (!s) return;
        this.busy.set(true);
        this.api.revokePortfolioShare(s.id).subscribe({
            next: () => { this.busy.set(false); this.current.set(null); this.link.set(''); },
            error: () => { this.busy.set(false); this.error.set(true); },
        });
    }

    copy() {
        if (!this.link()) return;
        navigator.clipboard?.writeText(this.link()).then(() => {
            this.copied.set(true); setTimeout(() => this.copied.set(false), 2000);
        }).catch(() => {});
    }

    selectAll(e: Event) { (e.target as HTMLInputElement).select(); }

    async downloadPdf() {
        const s = this.current();
        if (!s) return;
        this.pdfBusy.set(true);
        try {
            const blob = await firstValueFrom(this.api.downloadWealthStatementPdf(s.id));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'wealth-statement.pdf'; a.click();
            URL.revokeObjectURL(url);
        } finally {
            this.pdfBusy.set(false);
        }
    }
}
