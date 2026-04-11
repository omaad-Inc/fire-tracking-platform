import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DebtsService, DebtRecord } from '../../service/debts.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
    standalone: true,
    selector: 'app-debts-progress',
    imports: [
        CommonModule, FormsModule, ButtonModule, ToastModule,
        InputTextModule, SelectModule, InputNumberModule,
        DialogModule, ConfirmDialogModule, DatePickerModule, AppAmountComponent
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center" />
        <p-confirmDialog />

        <!-- ── Top bar ── -->
        <div class="flex flex-col gap-2 mb-5">
            <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0 flex-1">Dettes & Créances</h2>
                <button pButton icon="pi pi-plus" label="Nouveau"
                        class="!bg-gradient-to-r !from-rose-600 !to-indigo-500 !border-0 !text-white !rounded-xl !px-4 !py-2 !text-sm !font-semibold"
                        (click)="openNew()"></button>
            </div>
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

        <!-- ── Loading ── -->
        @if (loading()) {
            <div class="space-y-3">
                @for (i of [1,2,3]; track i) {
                    <div class="h-[110px] bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
                }
            </div>
        }

        <!-- ── Empty ── -->
        @else if (filteredRecords().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                    <i class="pi pi-credit-card text-xl text-surface-400"></i>
                </div>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4 px-4">
                    {{ search || typeFilter() !== 'all' ? 'Aucun résultat' : 'Aucune dette ou créance enregistrée' }}
                </p>
                @if (!search && typeFilter() === 'all') {
                    <button pButton icon="pi pi-plus" label="Ajouter"
                            [outlined]="true" class="!rounded-xl !text-sm" (click)="openNew()"></button>
                }
            </div>
        }

        <!-- ── Cards list ── -->
        @else {
            <div class="space-y-3">
                @for (rec of filteredRecords(); track rec.id) {
                    <div class="bg-surface-0 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
                        <!-- Header row -->
                        <div class="flex items-start gap-3 mb-3">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                 [ngClass]="rec.type === 'Debt' ? 'bg-rose-500/10' : 'bg-emerald-500/10'">
                                <i class="pi text-lg"
                                   [ngClass]="rec.type === 'Debt' ? 'pi-arrow-up-right text-rose-500' : 'pi-arrow-down-left text-emerald-500'"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ rec.name }}</span>
                                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                          [ngClass]="rec.type === 'Debt'
                                              ? 'bg-rose-500/10 text-rose-500'
                                              : 'bg-emerald-500/10 text-emerald-500'">
                                        {{ rec.type === 'Debt' ? 'Dette' : 'Créance' }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-3 mt-0.5 text-xs text-surface-400 flex-wrap">
                                    @if (rec.interestRate > 0) { <span>{{ rec.interestRate }}% intérêt</span> }
                                    @if (rec.frequency) { <span>· {{ rec.frequency }}</span> }
                                    @if (rec.date) { <span>· {{ rec.date }}</span> }
                                </div>
                            </div>
                            <!-- Actions: always visible on mobile, hover on desktop -->
                            <div class="flex gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                        (click)="editRecord(rec)" title="Modifier">
                                    <i class="pi pi-pencil text-xs text-surface-500"></i>
                                </button>
                                <button class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                        (click)="openAddPaymentDialog(rec)" title="Ajouter un paiement">
                                    <i class="pi pi-plus text-xs text-emerald-500"></i>
                                </button>
                                <button class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                                        (click)="deleteRecord(rec)" title="Supprimer">
                                    <i class="pi pi-trash text-xs text-surface-500"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Amounts row -->
                        <div class="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div class="bg-surface-50 dark:bg-surface-700/50 rounded-xl p-2">
                                <div class="text-[10px] text-surface-400 mb-0.5">Total</div>
                                <div class="text-sm font-bold text-surface-900 dark:text-surface-0"><app-amount [value]="rec.total" /></div>
                            </div>
                            <div class="bg-surface-50 dark:bg-surface-700/50 rounded-xl p-2">
                                <div class="text-[10px] text-surface-400 mb-0.5">{{ rec.type === 'Debt' ? 'Payé' : 'Reçu' }}</div>
                                <div class="text-sm font-bold text-emerald-500"><app-amount [value]="rec.paid" /></div>
                            </div>
                            <div class="bg-surface-50 dark:bg-surface-700/50 rounded-xl p-2">
                                <div class="text-[10px] text-surface-400 mb-0.5">Reste</div>
                                <div class="text-sm font-bold text-rose-500"><app-amount [value]="rec.total - rec.paid" /></div>
                            </div>
                        </div>

                        <!-- Progress bar -->
                        <div class="flex items-center gap-2">
                            <div class="flex-1 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500"
                                     [ngClass]="rec.type === 'Debt' ? 'bg-gradient-to-r from-indigo-600 to-indigo-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'"
                                     [style.width]="getPercent(rec) + '%'"></div>
                            </div>
                            <span class="text-xs font-semibold shrink-0"
                                  [ngClass]="rec.type === 'Debt' ? 'text-indigo-500' : 'text-emerald-500'">
                                {{ getPercent(rec) }}%
                            </span>
                        </div>
                    </div>
                }
            </div>
        }

        <!-- ── Add / Edit dialog ── -->
        <p-dialog [(visible)]="productDialog"
                  [style]="{ width: '95vw', maxWidth: '650px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                        <i class="pi pi-credit-card text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ isEdit ? 'Modifier' : 'Nouvelle dette / créance' }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Gérez vos dettes et créances</p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                    <!-- Type toggle -->
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">Type</label>
                        <div class="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
                            <button (click)="record.type = 'Debt'"
                                    class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                    [ngClass]="record.type === 'Debt' ? 'bg-white dark:bg-surface-700 text-rose-500 shadow-sm' : 'text-surface-500'">
                                Dette (je dois)
                            </button>
                            <button (click)="record.type = 'Receivable'"
                                    class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                    [ngClass]="record.type === 'Receivable' ? 'bg-white dark:bg-surface-700 text-emerald-500 shadow-sm' : 'text-surface-500'">
                                Créance (on me doit)
                            </button>
                        </div>
                    </div>

                    <!-- Name -->
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">Nom <span class="text-rose-400">*</span></label>
                        <input pInputText [(ngModel)]="record.name" required
                               class="w-full !py-3 !rounded-xl"
                               placeholder="Ex: Prêt immobilier, Ami..." />
                        @if (submitted && !record.name) {
                            <small class="text-rose-500 text-xs">Le nom est requis</small>
                        }
                    </div>

                    <!-- Total -->
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">
                            Montant total <span class="text-rose-400">*</span>
                            <span class="text-surface-400 font-normal ml-1">({{ cs.config().symbol }})</span>
                        </label>
                        <p-inputnumber [(ngModel)]="record.total" mode="decimal"
                                       [minFractionDigits]="0" [maxFractionDigits]="0"
                                       styleClass="w-full"
                                       inputStyleClass="!py-3 !rounded-xl" />
                    </div>

                    <!-- Paid -->
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">
                            {{ record.type === 'Debt' ? 'Déjà payé' : 'Déjà reçu' }}
                            <span class="text-surface-400 font-normal ml-1">({{ cs.config().symbol }})</span>
                        </label>
                        <p-inputnumber [(ngModel)]="record.paid" mode="decimal"
                                       [minFractionDigits]="0" [maxFractionDigits]="0"
                                       styleClass="w-full"
                                       inputStyleClass="!py-3 !rounded-xl" />
                    </div>

                    <!-- Interest Rate -->
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">Taux d'intérêt</label>
                        <p-inputnumber [(ngModel)]="record.interestRate" mode="decimal"
                                       [minFractionDigits]="2" [maxFractionDigits]="2" suffix=" %"
                                       styleClass="w-full" inputStyleClass="!py-3 !rounded-xl" />
                    </div>

                    <!-- Frequency -->
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">Fréquence</label>
                        <p-select [(ngModel)]="record.frequency" [options]="frequencies"
                                  optionLabel="label" optionValue="value"
                                  placeholder="Choisir une fréquence"
                                  styleClass="w-full !rounded-xl" />
                    </div>

                    <!-- Date -->
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">Date</label>
                        <input type="date" pInputText [(ngModel)]="record.date"
                               class="w-full !py-3 !rounded-xl" />
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex gap-3 pt-2">
                    <p-button label="Annuler" icon="pi pi-times" [outlined]="true"
                              (click)="hideDialog()" styleClass="flex-1 !rounded-xl !py-3" />
                    <p-button [label]="isEdit ? 'Mettre à jour' : 'Enregistrer'" icon="pi pi-check"
                              [loading]="isSaving()"
                              (click)="saveRecord()"
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-rose-600 !to-indigo-500 !border-0" />
                </div>
            </ng-template>
        </p-dialog>

        <!-- ── Add Payment dialog ── -->
        <p-dialog [(visible)]="addPaymentDialog"
                  [style]="{ width: '95vw', maxWidth: '420px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                        <i class="pi pi-plus text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">Ajouter un paiement</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">{{ paymentRecord?.name }}</p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                @if (paymentRecord) {
                    <div class="flex flex-col gap-5 pt-3">
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-3">
                                <div class="text-[10px] text-surface-400 mb-1">Total</div>
                                <div class="text-sm font-bold text-surface-900 dark:text-surface-0"><app-amount [value]="paymentRecord.total" /></div>
                            </div>
                            <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-3">
                                <div class="text-[10px] text-surface-400 mb-1">Payé</div>
                                <div class="text-sm font-bold text-emerald-500"><app-amount [value]="paymentRecord.paid" /></div>
                            </div>
                            <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-3">
                                <div class="text-[10px] text-surface-400 mb-1">Reste</div>
                                <div class="text-sm font-bold text-rose-500"><app-amount [value]="paymentRecord.total - paymentRecord.paid" /></div>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">
                                Montant à ajouter <span class="text-surface-400 font-normal">({{ cs.config().symbol }})</span>
                            </label>
                            <p-inputnumber [(ngModel)]="addPaymentAmount" mode="decimal"
                                           [minFractionDigits]="0" [maxFractionDigits]="0"
                                           [min]="1" [max]="paymentRecord.total - paymentRecord.paid"
                                           styleClass="w-full"
                                           inputStyleClass="!py-3 !rounded-xl !text-lg !font-semibold" />
                            @if (addPaymentSubmitted && !(addPaymentAmount! > 0)) {
                                <small class="text-rose-500 text-xs">Montant requis</small>
                            }
                        </div>
                    </div>
                }
            </ng-template>

            <ng-template #footer>
                <div class="flex gap-3 pt-2">
                    <p-button label="Annuler" icon="pi pi-times" [outlined]="true"
                              (click)="closeAddPaymentDialog()" styleClass="flex-1 !rounded-xl !py-3" />
                    <p-button label="Valider" icon="pi pi-check"
                              (click)="confirmAddPayment()"
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-emerald-600 !to-cyan-500 !border-0" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class DebtsProgress implements OnInit {
    private debtsService        = inject(DebtsService);
    cs = inject(CurrencyService);
    private messageService      = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    productDialog      = false;
    addPaymentDialog   = false;
    addPaymentAmount: number | null = null;
    addPaymentSubmitted = false;
    paymentRecord: DebtRecord | null = null;
    isEdit   = false;
    loading  = signal(true);
    isSaving = signal(false);
    submitted = false;

    private allRecords = signal<DebtRecord[]>([]);
    record!: DebtRecord;

    search     = '';
    typeFilter = signal<'all' | 'Debt' | 'Receivable'>('all');

    typeFilters = [
        { label: 'Tous',      value: 'all'         as const },
        { label: 'Dettes',    value: 'Debt'        as const },
        { label: 'Créances',  value: 'Receivable'  as const },
    ];

    frequencies = [
        { label: 'Mensuel', value: 'Mensuel' },
        { label: 'Unique',  value: 'Unique'  },
        { label: 'Libre',   value: 'Libre'   },
    ];

    readonly filteredRecords = computed(() => {
        const filter = this.typeFilter();
        const q      = this.search.toLowerCase().trim();
        return this.allRecords()
            .filter(r => filter === 'all' || r.type === filter)
            .filter(r => !q || (r.name || '').toLowerCase().includes(q));
    });

    ngOnInit() {
        this.loadFromService();
    }

    loadFromService() {
        this.loading.set(true);
        this.debtsService.getRecords()
            .then(data => this.allRecords.set(data))
            .finally(() => this.loading.set(false));
    }

    openNew() {
        this.record = { date: new Date().toISOString().split('T')[0], type: 'Debt', category: 'other', total: 0, paid: 0, name: '', note: '', interestRate: 0, frequency: 'Mensuel' };
        this.submitted = false;
        this.isEdit = false;
        this.productDialog = true;
    }

    editRecord(record: DebtRecord) {
        this.record = { ...record };
        this.submitted = false;
        this.isEdit = true;
        this.productDialog = true;
    }

    hideDialog() {
        this.productDialog = false;
        this.submitted = false;
        this.isEdit = false;
    }

    deleteRecord(record: DebtRecord) {
        this.confirmationService.confirm({
            message: `Supprimer "${record.name}" ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: '!bg-rose-500 !border-rose-500',
            accept: async () => {
                if (!record.id) return;
                try {
                    await this.debtsService.deleteRecords([record.id]);
                    this.allRecords.update(rs => rs.filter(r => r.id !== record.id));
                    this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Enregistrement supprimé.', life: 3000 });
                } catch {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.', life: 4000 });
                }
            }
        });
    }

    async saveRecord() {
        this.submitted = true;
        if (!this.record.name?.trim()) return;

        this.isSaving.set(true);
        try {
            if (this.record.id) {
                const updated = await this.debtsService.updateRecord(this.record);
                this.allRecords.update(rs => rs.map(r => r.id === updated.id ? updated : r));
                this.messageService.add({ severity: 'success', summary: 'Modifié', detail: 'Enregistrement mis à jour.', life: 3000 });
            } else {
                const created = await this.debtsService.addRecord(this.record);
                this.allRecords.update(rs => [...rs, created]);
                this.messageService.add({ severity: 'success', summary: 'Créé', detail: 'Enregistrement ajouté.', life: 3000 });
            }
            this.productDialog = false;
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible d\'enregistrer.', life: 5000 });
        } finally {
            this.isSaving.set(false);
        }
    }

    getPercent(record: DebtRecord): number {
        if (!record.total) return 0;
        return Math.min(100, Math.round((record.paid / record.total) * 100));
    }

    openAddPaymentDialog(record: DebtRecord) {
        this.paymentRecord     = record;
        this.addPaymentAmount  = null;
        this.addPaymentSubmitted = false;
        this.addPaymentDialog  = true;
    }

    closeAddPaymentDialog() {
        this.addPaymentDialog  = false;
        this.paymentRecord     = null;
        this.addPaymentAmount  = null;
        this.addPaymentSubmitted = false;
    }

    async confirmAddPayment() {
        this.addPaymentSubmitted = true;
        if (!this.paymentRecord?.id || !(this.addPaymentAmount! > 0)) return;
        try {
            const updated = await this.debtsService.addPayment(this.paymentRecord.id, this.addPaymentAmount!);
            this.allRecords.update(rs => rs.map(r => r.id === updated.id ? updated : r));
            this.messageService.add({ severity: 'success', summary: 'Paiement ajouté', detail: 'Remboursement enregistré.', life: 3000 });
            this.closeAddPaymentDialog();
        } catch {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'ajouter le paiement.', life: 4000 });
        }
    }
}
