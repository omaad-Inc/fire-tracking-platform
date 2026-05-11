import { Component, OnInit, signal, computed, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
    TransactionsService, TransactionRecord,
    CATEGORY_CONFIG, INCOME_CATEGORIES, EXPENSE_CATEGORIES
} from '../../service/transactions.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';

interface DayGroup {
    dateKey: string;
    label: string;
    records: TransactionRecord[];
}

@Component({
    selector: 'app-transaction-logs',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule,
        InputTextModule, InputNumberModule, SelectModule,
        ToastModule, ConfirmDialogModule, DatePickerModule, AppAmountComponent
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center" />
        <p-confirmDialog />

        <!-- ── Top bar ───────────────────────────────────────────── -->
        <div class="flex flex-col gap-2 mb-5">
            <!-- Row 1: month nav + add button -->
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl px-1 py-1">
                    <button pButton icon="pi pi-chevron-left" [text]="true" size="small"
                            class="!rounded-lg !w-8 !h-8" (click)="prevMonth()"></button>
                    <span class="px-2 text-sm font-semibold text-surface-900 dark:text-surface-0 min-w-[110px] text-center">
                        {{ monthLabel() }}
                    </span>
                    <button pButton icon="pi pi-chevron-right" [text]="true" size="small"
                            class="!rounded-lg !w-8 !h-8" (click)="nextMonth()"
                            [disabled]="isCurrentMonth()"></button>
                </div>
                <div class="flex-1"></div>
                <button pButton icon="pi pi-plus" label="Ajouter"
                        class="omaad-cta !rounded-xl !px-4 !py-2 !text-sm !font-semibold"
                        (click)="openNew()"></button>
            </div>
            <!-- Row 2: search + type filter -->
            <div class="flex items-center gap-2">
                <div class="relative flex-1 min-w-0">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                    <input pInputText [(ngModel)]="search" placeholder="Rechercher..."
                           class="w-full !pl-9 !py-2.5 !rounded-xl !text-sm" />
                </div>
                <div class="flex items-center gap-0.5 bg-surface-100 dark:bg-surface-800 rounded-xl p-1 shrink-0">
                    @for (f of typeFilters; track f.value) {
                        <button (click)="typeFilter.set(f.value)"
                                class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                                [class]="typeFilter() === f.value
                                    ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-0 shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400'">
                            {{ f.label }}
                        </button>
                    }
                </div>
            </div>
        </div>

        <!-- ── Monthly KPI summary ───────────────────────────────── -->
        @if (!loading()) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <!-- Revenus -->
                <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-4 h-[86px] flex flex-col justify-between">
                    <div class="absolute inset-0 bg-gradient-to-br from-surface-50 to-positive/5 dark:from-surface-800 dark:to-surface-900"></div>
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">Revenus</span>
                        <div class="w-7 h-7 rounded-lg bg-positive/10 flex items-center justify-center">
                            <i class="pi pi-arrow-down-left text-positive text-xs"></i>
                        </div>
                    </div>
                    <div class="relative text-base font-bold text-positive truncate">+<app-amount [value]="monthSummary().income" /></div>
                </div>
                <!-- Dépenses -->
                <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-4 h-[86px] flex flex-col justify-between">
                    <div class="absolute inset-0 bg-gradient-to-br from-surface-50 to-negative/5 dark:from-surface-800 dark:to-surface-900"></div>
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">Dépenses</span>
                        <div class="w-7 h-7 rounded-lg bg-negative/10 flex items-center justify-center">
                            <i class="pi pi-arrow-up-right text-negative text-xs"></i>
                        </div>
                    </div>
                    <div class="relative text-base font-bold text-negative truncate">−<app-amount [value]="monthSummary().expenses" /></div>
                </div>
                <!-- Solde net -->
                <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-4 h-[86px] flex flex-col justify-between">
                    <div class="absolute inset-0 bg-gradient-to-br from-surface-50 to-brand-50/30 dark:from-surface-800 dark:to-surface-900"></div>
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">Solde net</span>
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                             [ngClass]="monthSummary().net >= 0 ? 'bg-brand-700/10 dark:bg-brand-300/15' : 'bg-negative/10'">
                            <i class="pi text-xs"
                               [ngClass]="monthSummary().net >= 0 ? 'pi-trending-up text-brand-700 dark:text-brand-300' : 'pi-trending-down text-negative'"></i>
                        </div>
                    </div>
                    <div class="relative text-base font-bold truncate"
                         [ngClass]="monthSummary().net >= 0 ? 'text-brand-700 dark:text-brand-300' : 'text-negative'">
                        {{ monthSummary().net >= 0 ? '+' : '−' }}<app-amount [value]="monthSummary().net" />
                    </div>
                </div>
                <!-- Taux d'épargne -->
                <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-4 h-[86px] flex flex-col justify-between">
                    <div class="absolute inset-0 bg-gradient-to-br from-surface-50 to-brand-50/20 dark:from-surface-800 dark:to-surface-900"></div>
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">Taux d'épargne</span>
                        <div class="w-7 h-7 rounded-lg bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center">
                            <i class="pi pi-percentage text-brand-700 dark:text-brand-300 text-xs"></i>
                        </div>
                    </div>
                    <div class="relative">
                        <div class="text-base font-bold text-brand-700 dark:text-brand-300 mb-1">{{ monthSummary().savingsRate }}%</div>
                        <div class="h-1 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div class="h-full bg-brand-700 dark:bg-brand-300 rounded-full transition-all duration-500"
                                 [style.width]="monthSummary().savingsRate + '%'"></div>
                        </div>
                    </div>
                </div>
            </div>
        }

        <!-- ── Transaction list ───────────────────────────────────── -->
        @if (loading()) {
            <div class="space-y-2">
                @for (i of [1,2,3,4,5]; track i) {
                    <div class="h-[62px] bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"></div>
                }
            </div>
        } @else if (dayGroups().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                    <i class="pi pi-arrow-right-arrow-left text-xl text-surface-400"></i>
                </div>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4 px-4">
                    {{ search || typeFilter() !== 'all'
                        ? 'Aucune transaction ne correspond à vos filtres'
                        : 'Aucune transaction ce mois-ci' }}
                </p>
                @if (!search && typeFilter() === 'all') {
                    <button pButton icon="pi pi-plus" label="Ajouter une transaction"
                            [outlined]="true" class="!rounded-xl !text-sm" (click)="openNew()"></button>
                }
            </div>
        } @else {
            <div class="space-y-6">
                @for (group of dayGroups(); track group.dateKey) {
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                                {{ group.label }}
                            </span>
                            <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                            <span class="text-xs text-surface-400 dark:text-surface-500">
                                {{ group.records.length }} opération{{ group.records.length > 1 ? 's' : '' }}
                            </span>
                        </div>

                        <div class="bg-surface-0 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-700/50 overflow-hidden">
                            @for (rec of group.records; track rec.id) {
                                <div class="flex items-center gap-3 px-3 py-3 sm:px-4 hover:bg-surface-50 dark:hover:bg-surface-700/40 transition-colors group">
                                    <!-- Category icon -->
                                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
                                         [style.background]="getCategoryConfig(rec).color + '1a'">
                                        <i [class]="getCategoryConfig(rec).icon + ' text-xs sm:text-sm'"
                                           [style.color]="getCategoryConfig(rec).color"></i>
                                    </div>
                                    <!-- Name + category -->
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium text-surface-900 dark:text-surface-0 truncate leading-tight">
                                            {{ rec.remarks || rec.name }}
                                        </div>
                                        <span class="inline-flex items-center text-[10px] sm:text-xs mt-0.5 px-1.5 py-0.5 rounded-full"
                                              [style.color]="getCategoryConfig(rec).color"
                                              [style.background]="getCategoryConfig(rec).color + '1a'">
                                            {{ getCategoryConfig(rec).label }}
                                        </span>
                                    </div>
                                    <!-- Amount -->
                                    <div class="text-sm font-bold shrink-0"
                                         [ngClass]="rec.type === 'Income' ? 'text-positive' : 'text-negative'">
                                        {{ rec.type === 'Income' ? '+' : '−' }}<app-amount [value]="rec.amount" />
                                    </div>
                                    <!-- Actions: always visible on mobile, hover-reveal on desktop -->
                                    <div class="flex gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button class="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-700/30 transition-colors"
                                                (click)="editRecord(rec)">
                                            <i class="pi pi-pencil text-xs text-surface-500"></i>
                                        </button>
                                        <button class="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-negative-50 dark:hover:bg-negative-700/30 transition-colors"
                                                (click)="deleteRecord(rec)">
                                            <i class="pi pi-trash text-xs text-surface-500"></i>
                                        </button>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                }
            </div>
        }

        <!-- ── Add / Edit dialog ──────────────────────────────────── -->
        <p-dialog [(visible)]="dialogVisible"
                  [style]="{ width: '95vw', maxWidth: '680px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                         [ngClass]="formType() === 'Income'
                             ? 'bg-positive shadow-card'
                             : 'bg-negative shadow-card'">
                        <i class="pi text-white text-lg"
                           [ngClass]="formType() === 'Income' ? 'pi-arrow-down-left' : 'pi-arrow-up-right'"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ editingRecord ? 'Modifier la transaction' : 'Nouvelle transaction' }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">
                            {{ editingRecord ? 'Modifiez les détails' : 'Renseignez les informations ci-dessous' }}
                        </p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <div class="flex flex-col gap-6 pt-2">

                    <!-- Type toggle -->
                    <div class="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
                        <button (click)="setType('Expense')"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="formType() === 'Expense'
                                    ? 'bg-white dark:bg-surface-700 text-negative shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700'">
                            <i class="pi pi-arrow-up-right text-xs"></i> Dépense
                        </button>
                        <button (click)="setType('Income')"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="formType() === 'Income'
                                    ? 'bg-white dark:bg-surface-700 text-positive shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700'">
                            <i class="pi pi-arrow-down-left text-xs"></i> Revenu
                        </button>
                    </div>

                    <!-- Amount + Date row -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                Montant <span class="text-surface-400 font-normal">({{ cs.config().symbol }})</span>
                            </label>
                            <p-inputnumber [(ngModel)]="form.amount" mode="decimal"
                                           [minFractionDigits]="0" [maxFractionDigits]="0"
                                           styleClass="w-full"
                                           inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !text-lg !font-semibold" />
                            @if (submitted && !(form.amount > 0)) {
                                <small class="text-negative text-xs mt-1">Montant requis</small>
                            }
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">Date</label>
                            <p-datepicker [(ngModel)]="editDate" [showIcon]="true" [showButtonBar]="true"
                                          dateFormat="yy-mm-dd" styleClass="w-full"
                                          inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                            @if (submitted && !editDate) {
                                <small class="text-negative text-xs mt-1">Date requise</small>
                            }
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            Description <span class="text-surface-400 font-normal">(optionnel)</span>
                        </label>
                        <input pInputText [(ngModel)]="form.remarks"
                               placeholder="Ex : Salaire avril, Courses Auchan..."
                               class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                    </div>

                    <!-- Category grid -->
                    <div class="flex flex-col gap-3">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            Catégorie
                            @if (submitted && !form.category) {
                                <span class="text-negative ml-2 text-xs">Requise</span>
                            }
                        </label>
                        <div class="grid grid-cols-3 gap-2">
                            @for (cat of currentCategories(); track cat) {
                                <button (click)="form.category = cat"
                                        class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-all text-center"
                                        [style.border-color]="form.category === cat ? getCatConfig(cat).color : ''"
                                        [style.background]="form.category === cat ? getCatConfig(cat).color + '15' : ''"
                                        [ngClass]="form.category === cat
                                            ? 'shadow-sm scale-[1.02]'
                                            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                                         [style.background]="getCatConfig(cat).color + '20'">
                                        <i [class]="getCatConfig(cat).icon + ' text-sm'"
                                           [style.color]="getCatConfig(cat).color"></i>
                                    </div>
                                    <span class="text-[11px] font-medium leading-tight text-surface-700 dark:text-surface-300">
                                        {{ getCatConfig(cat).label }}
                                    </span>
                                </button>
                            }
                        </div>
                    </div>

                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button [label]="editingRecord ? 'Mettre à jour' : 'Enregistrer'" icon="pi pi-check"
                              [loading]="isSaving()"
                              (click)="saveRecord()"
                              styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button label="Annuler" icon="pi pi-times" [outlined]="true"
                              (click)="hideDialog()"
                              styleClass="w-full !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class TransactionLogs implements OnInit {
    private transactionsService = inject(TransactionsService);
    private messageService      = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    cs = inject(CurrencyService);

    @Output() monthChanged = new EventEmitter<string>();

    // ── State ─────────────────────────────────────────────────────
    loading   = signal(true);
    isSaving  = signal(false);
    submitted = false;

    private allRecords   = signal<TransactionRecord[]>([]);
    private _selectedYear  = signal(new Date().getFullYear());
    private _selectedMonth = signal(new Date().getMonth() + 1);

    search     = '';
    typeFilter = signal<'all' | 'Income' | 'Expense'>('all');

    typeFilters = [
        { label: 'Tous',     value: 'all'     as const },
        { label: 'Revenus',  value: 'Income'  as const },
        { label: 'Dépenses', value: 'Expense' as const },
    ];

    // ── Dialog state ──────────────────────────────────────────────
    dialogVisible  = false;
    editingRecord: TransactionRecord | null = null;
    editDate: Date | null = null;
    // formType is a Signal so computed() can track changes reactively
    formType = signal<'Income' | 'Expense'>('Expense');
    form: { amount: number; remarks: string; category: string } = {
        amount: 0, remarks: '', category: EXPENSE_CATEGORIES[0]
    };

    readonly currentCategories = computed(() =>
        this.formType() === 'Income' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES]
    );

    getCatConfig(cat: string) {
        return CATEGORY_CONFIG[cat] ?? { label: cat, icon: 'pi pi-circle', color: '#94a3b8', bg: '' };
    }

    setType(t: 'Income' | 'Expense') {
        this.formType.set(t);
        const cats = t === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        if (!(cats as readonly string[]).includes(this.form.category)) {
            this.form.category = cats[0];
        }
    }

    // ── Computed ──────────────────────────────────────────────────
    readonly selectedYearMonth = computed(() => {
        const y = this._selectedYear();
        const m = String(this._selectedMonth()).padStart(2, '0');
        return `${y}-${m}`;
    });

    readonly monthLabel = computed(() => {
        const d = new Date(this._selectedYear(), this._selectedMonth() - 1, 1);
        return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                .replace(/^\w/, c => c.toUpperCase());
    });

    readonly isCurrentMonth = computed(() => {
        const now = new Date();
        return this._selectedYear() === now.getFullYear() && this._selectedMonth() === now.getMonth() + 1;
    });

    readonly filteredRecords = computed(() => {
        const ym     = this.selectedYearMonth();
        const filter = this.typeFilter();
        const q      = this.search.toLowerCase().trim();

        return this.allRecords()
            .filter(r => r.date.startsWith(ym))
            .filter(r => filter === 'all' || r.type === filter)
            .filter(r => !q ||
                (r.name    || '').toLowerCase().includes(q) ||
                (r.remarks || '').toLowerCase().includes(q));
    });

    readonly monthSummary = computed(() => {
        const ym = this.selectedYearMonth();
        const recs = this.allRecords().filter(r => r.date.startsWith(ym));
        const income   = recs.filter(r => r.type === 'Income') .reduce((s, r) => s + r.amount, 0);
        const expenses = recs.filter(r => r.type === 'Expense').reduce((s, r) => s + r.amount, 0);
        const net      = income - expenses;
        const savingsRate = income > 0 ? Math.max(0, Math.min(100, Math.round(net / income * 100))) : 0;
        return { income, expenses, net, savingsRate };
    });

    readonly dayGroups = computed((): DayGroup[] => {
        const byDay: Record<string, TransactionRecord[]> = {};
        for (const r of this.filteredRecords()) {
            (byDay[r.date] = byDay[r.date] || []).push(r);
        }
        return Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([dateKey, records]) => ({
                dateKey,
                label: this.formatDayLabel(dateKey),
                records: [...records].sort((a, b) => (b.id || '').localeCompare(a.id || ''))
            }));
    });

    ngOnInit() {
        this.load();
    }

    private async load() {
        this.loading.set(true);
        try {
            const recs = await this.transactionsService.getRecords();
            this.allRecords.set(recs);
            this.emitMonth();
        } finally {
            this.loading.set(false);
        }
    }

    private emitMonth() {
        this.monthChanged.emit(this.selectedYearMonth());
    }

    // ── Month navigation ──────────────────────────────────────────
    prevMonth() {
        let m = this._selectedMonth() - 1;
        let y = this._selectedYear();
        if (m < 1) { m = 12; y--; }
        this._selectedMonth.set(m);
        this._selectedYear.set(y);
        this.emitMonth();
    }

    nextMonth() {
        if (this.isCurrentMonth()) return;
        let m = this._selectedMonth() + 1;
        let y = this._selectedYear();
        if (m > 12) { m = 1; y++; }
        this._selectedMonth.set(m);
        this._selectedYear.set(y);
        this.emitMonth();
    }

    // ── Dialog ────────────────────────────────────────────────────
    openNew() {
        this.editingRecord = null;
        this.editDate = new Date();
        this.formType.set('Expense');
        this.form = { amount: 0, remarks: '', category: EXPENSE_CATEGORIES[0] };
        this.submitted = false;
        this.dialogVisible = true;
    }

    editRecord(rec: TransactionRecord) {
        this.editingRecord = rec;
        this.editDate = rec.date ? new Date(rec.date) : new Date();
        this.formType.set(rec.type);
        this.form = {
            amount:   rec.amount,
            remarks:  rec.remarks || rec.name || '',
            category: rec.category || (rec.type === 'Income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
        };
        this.submitted = false;
        this.dialogVisible = true;
    }

    hideDialog() {
        this.dialogVisible = false;
        this.submitted = false;
    }

    async saveRecord() {
        this.submitted = true;
        if (!this.editDate || !(this.form.amount > 0) || !this.form.category) return;

        const dateStr = this.toDateStr(this.editDate);
        this.isSaving.set(true);

        try {
            if (this.editingRecord?.id) {
                const updated = await this.transactionsService.updateRecord({
                    ...this.editingRecord,
                    date:     dateStr,
                    type:     this.formType(),
                    amount:   this.form.amount,
                    remarks:  this.form.remarks,
                    category: this.form.category,
                    name:     this.form.remarks || CATEGORY_CONFIG[this.form.category]?.label || this.editingRecord.name,
                });
                this.allRecords.update(rs => rs.map(r => r.id === updated.id ? updated : r));
                this.messageService.add({ severity: 'success', summary: 'Modifié', detail: 'Transaction mise à jour.', life: 3000 });
            } else {
                const created = await this.transactionsService.addRecord({
                    date:     dateStr,
                    type:     this.formType(),
                    amount:   this.form.amount,
                    remarks:  this.form.remarks,
                    category: this.form.category,
                    name:     this.form.remarks || CATEGORY_CONFIG[this.form.category]?.label || (this.formType() === 'Income' ? 'Revenu' : 'Dépense'),
                });
                this.allRecords.update(rs => [created, ...rs]);
                this.messageService.add({ severity: 'success', summary: 'Enregistré', detail: 'Transaction ajoutée.', life: 3000 });
            }
            this.dialogVisible = false;
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Erreur',
                detail: err?.message || 'Impossible d\'enregistrer la transaction.', life: 5000 });
        } finally {
            this.isSaving.set(false);
        }
    }

    deleteRecord(rec: TransactionRecord) {
        this.confirmationService.confirm({
            message: `Supprimer cette transaction ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: '!bg-negative !border-negative',
            accept: async () => {
                if (!rec.id) return;
                try {
                    await this.transactionsService.deleteRecords([rec.id]);
                    this.allRecords.update(rs => rs.filter(r => r.id !== rec.id));
                    this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Transaction supprimée.', life: 3000 });
                } catch {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.', life: 4000 });
                }
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────
    getCategoryConfig(rec: TransactionRecord) {
        const cat = rec.category || (rec.type === 'Income' ? 'other_income' : 'other_expense');
        return CATEGORY_CONFIG[cat] ?? { label: rec.name || cat, icon: 'pi pi-circle', color: '#94a3b8', bg: 'bg-warm-500/10' };
    }

    private formatDayLabel(dateStr: string): string {
        const today     = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const dt        = new Date(dateStr + 'T00:00:00');

        if (dt.getTime() === today.getTime())     return 'Aujourd\'hui';
        if (dt.getTime() === yesterday.getTime()) return 'Hier';

        return new Date(dateStr + 'T12:00:00')
            .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
            .replace(/^\w/, c => c.toUpperCase());
    }

    private toDateStr(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
