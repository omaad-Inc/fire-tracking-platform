import { Component, EventEmitter, Output, effect, inject, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
    TransactionsService, TransactionRecord,
    CATEGORY_CONFIG, INCOME_CATEGORIES, EXPENSE_CATEGORIES
} from '../../pages/service/transactions.service';
import { PatrimoineService } from '../../pages/service/patrimoine.service';
import { AssetsStateService } from '../../pages/service/assets-state.service';
import { CurrencyService } from '../../core/services/currency.service';
import { I18nService } from '../../i18n/i18n.service';

/** Monetary asset categories usable as a transaction account. Mirrors
 *  TransactionLogs.MONETARY_CATEGORIES — keep the two in sync. */
const MONETARY_CATEGORIES = ['cash', 'savings_account', 'mobile_money'];
const LAST_ACCOUNT_KEY = 'omaad_quick_account';

/**
 * Sub-5-second transaction entry: a slide-up sheet with a numpad, an
 * income/expense toggle, the user's 3 most-used categories (with a full
 * grid on demand) and their last-used account pre-selected. No 5-field
 * modal — manual entry is the only ingestion path, so it has to be fast.
 */
@Component({
    selector: 'app-quick-add-sheet',
    standalone: true,
    imports: [CommonModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center" key="quickadd" />

        <!-- Backdrop -->
        <div class="fixed inset-0 z-[60] transition-opacity duration-300"
             [class.pointer-events-none]="!open()"
             [class.opacity-0]="!open()"
             [class.opacity-100]="open()">
            <div class="absolute inset-0 bg-black/40" (click)="close.emit()"></div>

            <!-- Sheet -->
            <div class="absolute left-0 right-0 bottom-0 bg-surface-0 dark:bg-surface-900 rounded-t-3xl shadow-2xl
                        max-w-md mx-auto transition-transform duration-300 ease-out
                        px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
                 [class.translate-y-0]="open()"
                 [class.translate-y-full]="!open()"
                 (click)="$event.stopPropagation()">

                <!-- Grab handle -->
                <div class="w-10 h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 mx-auto mb-3"></div>

                @if (accounts().length === 0 && !loading()) {
                    <!-- No monetary account -> guide the user -->
                    <div class="flex flex-col items-center text-center py-8">
                        <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                            <i class="pi pi-wallet text-2xl text-surface-400"></i>
                        </div>
                        <p class="font-semibold text-surface-900 dark:text-surface-0">{{ i18n.t('quickAdd.noAccountTitle') }}</p>
                        <p class="text-surface-500 dark:text-surface-400 text-sm mt-1 mb-4 max-w-[16rem]">{{ i18n.t('quickAdd.noAccountDesc') }}</p>
                        <button class="px-4 py-2.5 rounded-xl bg-brand-700 text-white text-sm font-semibold" (click)="goAddAccount()">
                            {{ i18n.t('quickAdd.noAccountCta') }} <i class="pi pi-arrow-right text-xs ml-1"></i>
                        </button>
                    </div>
                } @else {
                    <!-- Expense / Income toggle -->
                    <div class="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl mb-4">
                        <button class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                                [ngClass]="type() === 'Expense' ? 'bg-surface-0 dark:bg-surface-700 text-negative shadow-sm' : 'text-surface-500'"
                                (click)="setType('Expense')">
                            <i class="pi pi-arrow-up-right text-xs mr-1"></i>{{ i18n.t('quickAdd.expense') }}
                        </button>
                        <button class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                                [ngClass]="type() === 'Income' ? 'bg-surface-0 dark:bg-surface-700 text-positive shadow-sm' : 'text-surface-500'"
                                (click)="setType('Income')">
                            <i class="pi pi-arrow-down-left text-xs mr-1"></i>{{ i18n.t('quickAdd.income') }}
                        </button>
                    </div>

                    <!-- Amount display -->
                    <div class="text-center mb-4">
                        <span class="text-4xl font-black tabular-nums"
                              [ngClass]="type() === 'Expense' ? 'text-surface-900 dark:text-surface-0' : 'text-positive'">
                            {{ type() === 'Expense' ? '−' : '+' }}{{ amountStr() }}
                        </span>
                        <span class="text-lg font-medium text-surface-400 ml-2">{{ symbol() }}</span>
                    </div>

                    <!-- Category chips -->
                    <div class="flex flex-wrap gap-2 justify-center mb-1">
                        @for (c of topCats(); track c) {
                            <button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                                    [ngClass]="category() === c
                                        ? 'bg-brand-700 border-brand-700 text-white'
                                        : 'bg-surface-0 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300'"
                                    (click)="category.set(c)">
                                <i [class]="icon(c)" class="text-[11px]"></i>{{ catLabel(c) }}
                            </button>
                        }
                        <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed
                                       border-surface-300 dark:border-surface-600 text-surface-500"
                                (click)="showAll.set(!showAll())">
                            <i class="pi pi-ellipsis-h text-[11px]"></i>{{ i18n.t('quickAdd.more') }}
                        </button>
                    </div>

                    <!-- Full category grid (on demand) -->
                    @if (showAll()) {
                        <div class="grid grid-cols-4 gap-2 my-3 max-h-40 overflow-y-auto">
                            @for (c of allCats(); track c) {
                                <button class="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-colors"
                                        [ngClass]="category() === c ? 'bg-brand-100 dark:bg-brand-700/25 text-brand-700 dark:text-brand-200' : 'text-surface-600 dark:text-surface-400'"
                                        (click)="category.set(c); showAll.set(false)">
                                    <i [class]="icon(c)" class="text-sm"></i>
                                    <span class="truncate w-full text-center">{{ catLabel(c) }}</span>
                                </button>
                            }
                        </div>
                    }

                    <!-- Account selector -->
                    <div class="flex items-center gap-2 my-3">
                        <i class="pi pi-wallet text-surface-400 text-sm"></i>
                        <select class="flex-1 bg-surface-100 dark:bg-surface-800 rounded-xl px-3 py-2 text-sm text-surface-900 dark:text-surface-0 border-0 focus:outline-none"
                                [value]="accountId() ?? ''" (change)="onAccountChange($event)">
                            @for (a of accounts(); track a.value) {
                                <option [value]="a.value" [selected]="a.value === accountId()">{{ a.label }}</option>
                            }
                        </select>
                    </div>

                    <!-- Numpad -->
                    <div class="grid grid-cols-3 gap-2">
                        @for (k of keys; track k) {
                            <button class="py-3.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-xl font-semibold text-surface-900 dark:text-surface-0 active:scale-95 transition-transform"
                                    [attr.aria-label]="k === 'back' ? 'delete' : k"
                                    (click)="press(k)">
                                @if (k === 'back') { <i class="pi pi-delete-left"></i> } @else { {{ k }} }
                            </button>
                        }
                    </div>

                    <!-- Save -->
                    <button class="w-full mt-3 py-3.5 rounded-xl bg-brand-700 text-white font-semibold text-sm disabled:opacity-40 active:scale-[0.99] transition-all"
                            [disabled]="!canSave() || saving()"
                            (click)="save()">
                        @if (saving()) { <i class="pi pi-spin pi-spinner mr-2"></i> }
                        {{ i18n.t('quickAdd.save') }}
                    </button>
                }
            </div>
        </div>
    `
})
export class QuickAddSheet {
    open = input<boolean>(false);
    @Output() close = new EventEmitter<void>();

    private txService = inject(TransactionsService);
    private patrimoineService = inject(PatrimoineService);
    private state = inject(AssetsStateService);
    private cs = inject(CurrencyService);
    private router = inject(Router);
    private toast = inject(MessageService);
    readonly i18n = inject(I18nService);

    readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

    loading = signal(true);
    saving = signal(false);
    type = signal<'Expense' | 'Income'>('Expense');
    amountStr = signal('0');
    category = signal('');
    accountId = signal<number | undefined>(undefined);
    accounts = signal<{ label: string; value: number }[]>([]);
    showAll = signal(false);

    private records = signal<TransactionRecord[]>([]);
    private wasOpen = false;

    symbol = computed(() => this.cs.config().symbol);
    allCats = computed(() =>
        (this.type() === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES) as readonly string[]);

    /** 3 most-used categories for the active type, padded from the defaults. */
    topCats = computed<string[]>(() => {
        const pool = this.allCats();
        const counts = new Map<string, number>();
        for (const r of this.records()) {
            if (r.type !== this.type() || !r.category) continue;
            if (!pool.includes(r.category)) continue;
            counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
        }
        const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
        for (const c of pool) { if (ranked.length >= 3) break; if (!ranked.includes(c)) ranked.push(c); }
        return ranked.slice(0, 3);
    });

    canSave = computed(() =>
        this.amountValue() > 0 && !!this.category() && this.accountId() != null);

    constructor() {
        // Reset + hydrate every time the sheet opens (rising edge only).
        effect(() => {
            const isOpen = this.open();
            if (isOpen && !this.wasOpen) this.onOpen();
            this.wasOpen = isOpen;
        });
    }

    private async onOpen() {
        this.amountStr.set('0');
        this.type.set('Expense');
        this.showAll.set(false);
        this.saving.set(false);
        this.loading.set(true);
        try {
            const [assets, recs] = await Promise.all([
                this.patrimoineService.getAssets(),
                this.txService.getRecords(),
            ]);
            const accts = assets
                .filter(a => MONETARY_CATEGORIES.includes(a.category))
                .map(a => ({ label: a.name, value: a.id }));
            this.accounts.set(accts);
            this.records.set(recs);

            // Default account: last-used (if still present) else first.
            const last = Number(localStorage.getItem(LAST_ACCOUNT_KEY));
            const preferred = accts.find(a => a.value === last) ?? accts[0];
            this.accountId.set(preferred?.value);
            this.category.set(this.topCats()[0] ?? '');
        } catch {
            this.accounts.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    setType(t: 'Expense' | 'Income') {
        if (this.type() === t) return;
        this.type.set(t);
        // Re-seed the selected category from the new type's top list.
        this.category.set(this.topCats()[0] ?? '');
        this.showAll.set(false);
    }

    amountValue(): number { return parseFloat(this.amountStr()) || 0; }

    press(k: string) {
        const cur = this.amountStr();
        if (k === 'back') {
            this.amountStr.set(cur.length <= 1 ? '0' : cur.slice(0, -1));
            return;
        }
        if (k === '.') {
            if (!cur.includes('.')) this.amountStr.set(cur + '.');
            return;
        }
        // digit
        if (cur === '0') { this.amountStr.set(k); return; }
        if (cur.replace('.', '').length >= 12) return;          // sane cap
        if (cur.includes('.') && cur.split('.')[1].length >= 2) return; // max 2 decimals
        this.amountStr.set(cur + k);
    }

    onAccountChange(e: Event) {
        this.accountId.set(Number((e.target as HTMLSelectElement).value));
    }

    icon(c: string): string { return CATEGORY_CONFIG[c]?.icon ?? 'pi pi-circle'; }

    /** Localized category label; falls back to CATEGORY_CONFIG then the key. */
    catLabel(c: string): string {
        return this.i18n.categoryLabel(c);
    }

    goAddAccount() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = match ? match[1] : 'fr';
        this.close.emit();
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'add-asset']);
    }

    async save() {
        if (!this.canSave() || this.saving()) return;
        this.saving.set(true);
        const cat = this.category();
        const record: TransactionRecord = {
            date: new Date().toISOString(),
            name: this.catLabel(cat),
            type: this.type(),
            amount: this.amountValue(),
            currency: this.cs.config().code,
            category: cat,
            accountId: this.accountId(),
            remarks: '',
        };
        try {
            await this.txService.addRecord(record);
            localStorage.setItem(LAST_ACCOUNT_KEY, String(this.accountId()));
            this.state.notifyTransactionsUpdated();
            this.toast.add({
                key: 'quickadd', severity: 'success',
                summary: this.i18n.t('quickAdd.saved'), life: 1800,
            });
            this.close.emit();
        } catch {
            this.toast.add({
                key: 'quickadd', severity: 'error',
                summary: this.i18n.t('quickAdd.saveError'), life: 2500,
            });
        } finally {
            this.saving.set(false);
        }
    }
}
