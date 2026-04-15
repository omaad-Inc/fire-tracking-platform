import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { SavingsService, SavingRecord, SavingsGoalDisplay } from '../../service/savings.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';

interface SavingRecordWithGoal extends SavingRecord {
    goalId?: number;
    goalName?: string;
}

@Component({
    selector: 'app-savings-transactions',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ButtonModule, ToastModule,
        InputTextModule, SelectModule, InputNumberModule,
        DialogModule, ConfirmDialogModule, AppAmountComponent
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center" />
        <p-confirmDialog />

        <!-- ── Top bar ── -->
        <div class="flex flex-col gap-2 mb-5">
            <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0 flex-1">Mouvements d'épargne</h2>
                <button pButton icon="pi pi-plus" label="Nouveau"
                        class="!bg-gradient-to-r !from-emerald-600 !to-cyan-500 !border-0 !text-white !rounded-xl !px-4 !py-2 !text-sm !font-semibold"
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

        <!-- ── Loading skeletons ── -->
        @if (loading()) {
            <div class="space-y-2">
                @for (i of [1,2,3,4]; track i) {
                    <div class="h-[62px] bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"></div>
                }
            </div>
        }

        <!-- ── Empty state ── -->
        @else if (filteredRecords().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                    <i class="pi pi-wallet text-xl text-surface-400"></i>
                </div>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4 px-4">
                    {{ search || typeFilter() !== 'all' ? 'Aucun mouvement ne correspond aux filtres' : 'Aucun mouvement d\'épargne enregistré' }}
                </p>
                @if (!search && typeFilter() === 'all') {
                    <button pButton icon="pi pi-plus" label="Ajouter un mouvement"
                            [outlined]="true" class="!rounded-xl !text-sm" (click)="openNew()"></button>
                }
            </div>
        }

        <!-- ── Records list ── -->
        @else {
            <div class="bg-surface-0 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-700/50 overflow-hidden">
                @for (rec of filteredRecords(); track rec.id) {
                    <div class="flex items-center gap-3 px-3 py-3 sm:px-4 hover:bg-surface-50 dark:hover:bg-surface-700/40 transition-colors group">
                        <!-- Type icon -->
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                             [ngClass]="rec.type === 'Deposit' ? 'bg-emerald-500/10' : 'bg-rose-500/10'">
                            <i class="pi text-sm"
                               [ngClass]="rec.type === 'Deposit' ? 'pi-arrow-down-left text-emerald-500' : 'pi-arrow-up-right text-rose-500'"></i>
                        </div>
                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0 truncate leading-tight">
                                {{ rec.name || (rec.type === 'Deposit' ? 'Dépôt' : 'Retrait') }}
                            </div>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[10px] text-surface-400">{{ rec.date }}</span>
                                @if (rec.goalName) {
                                    <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                                        <i class="pi pi-flag" style="font-size:8px"></i>{{ rec.goalName }}
                                    </span>
                                }
                            </div>
                        </div>
                        <!-- Amount -->
                        <div class="text-sm font-bold shrink-0"
                             [ngClass]="rec.type === 'Deposit' ? 'text-emerald-500' : 'text-rose-500'">
                            {{ rec.type === 'Deposit' ? '+' : '−' }}<app-amount [value]="rec.amount" />
                        </div>
                        <!-- Actions: always visible on mobile, hover on desktop -->
                        <div class="flex gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                    (click)="editRecord(rec)">
                                <i class="pi pi-pencil text-xs text-surface-500"></i>
                            </button>
                            <button class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                                    (click)="deleteRecord(rec)">
                                <i class="pi pi-trash text-xs text-surface-500"></i>
                            </button>
                        </div>
                    </div>
                }
            </div>
        }

        <!-- ── Add / Edit dialog ── -->
        <p-dialog [(visible)]="productDialog"
                  [style]="{ width: '95vw', maxWidth: '550px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <i class="pi pi-wallet text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ record.id ? 'Modifier le mouvement' : 'Nouveau mouvement' }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Enregistrer un mouvement d'épargne</p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <div class="flex flex-col gap-5 pt-3">
                    <!-- Type toggle -->
                    <div class="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
                        <button (click)="record.type = 'Deposit'"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="record.type === 'Deposit'
                                    ? 'bg-white dark:bg-surface-700 text-emerald-500 shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400'">
                            <i class="pi pi-arrow-down-left text-xs"></i> Dépôt
                        </button>
                        <button (click)="record.type = 'Withdrawal'"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="record.type === 'Withdrawal'
                                    ? 'bg-white dark:bg-surface-700 text-rose-500 shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400'">
                            <i class="pi pi-arrow-up-right text-xs"></i> Retrait
                        </button>
                    </div>

                    <!-- Amount + Date -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                            <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">
                                Montant <span class="text-rose-400">*</span>
                                <span class="text-surface-400 font-normal ml-1">({{ cs.config().symbol }})</span>
                            </label>
                            <p-inputnumber [(ngModel)]="record.amount" mode="decimal"
                                           [minFractionDigits]="0" [maxFractionDigits]="0"
                                           styleClass="w-full"
                                           inputStyleClass="!py-3 !rounded-xl !text-lg !font-semibold" />
                            @if (submitted && !(record.amount > 0)) {
                                <small class="text-rose-500 text-xs">Montant requis</small>
                            }
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">Date <span class="text-rose-400">*</span></label>
                            <input type="date" pInputText [(ngModel)]="record.date"
                                   class="w-full !py-3 !rounded-xl" />
                            @if (submitted && !record.date) {
                                <small class="text-rose-500 text-xs">Date requise</small>
                            }
                        </div>
                    </div>

                    <!-- Goal -->
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">
                            Objectif d'épargne <span class="text-surface-400 font-normal">(optionnel)</span>
                        </label>
                        <p-select [(ngModel)]="record.goalId"
                                  [options]="goalOptions()"
                                  optionLabel="label" optionValue="value"
                                  placeholder="Sélectionner un objectif"
                                  [showClear]="true"
                                  styleClass="w-full !rounded-xl" />
                    </div>

                    <!-- Description -->
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-700 dark:text-surface-300 font-medium text-sm">
                            Description <span class="text-surface-400 font-normal">(optionnel)</span>
                        </label>
                        <input type="text" pInputText [(ngModel)]="record.name"
                               class="w-full !py-3 !rounded-xl"
                               placeholder="Ex: Épargne mensuelle..." />
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex gap-3 pt-2">
                    <p-button label="Annuler" icon="pi pi-times" [outlined]="true"
                              (click)="hideDialog()" styleClass="flex-1 !rounded-xl !py-3" />
                    <p-button [label]="record.id ? 'Mettre à jour' : 'Enregistrer'" icon="pi pi-check"
                              [loading]="isSaving()"
                              (click)="saveRecord()"
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-emerald-600 !to-cyan-500 !border-0" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class SavingsTransactions implements OnInit, OnDestroy {
    private savingsService      = inject(SavingsService);
    private stateService        = inject(AssetsStateService);
    private messageService      = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    cs = inject(CurrencyService);

    private subscription?: Subscription;

    productDialog = false;
    isSaving      = signal(false);
    loading       = signal(true);
    submitted     = false;

    private allRecords = signal<SavingRecordWithGoal[]>([]);
    goalOptions = signal<{ label: string; value: number }[]>([]);

    record!: SavingRecordWithGoal;

    search     = '';
    typeFilter = signal<'all' | 'Deposit' | 'Withdrawal'>('all');

    typeFilters = [
        { label: 'Tous',     value: 'all'        as const },
        { label: 'Dépôts',   value: 'Deposit'    as const },
        { label: 'Retraits', value: 'Withdrawal' as const },
    ];

    private goals: SavingsGoalDisplay[] = [];

    readonly filteredRecords = computed(() => {
        const filter = this.typeFilter();
        const q      = this.search.toLowerCase().trim();
        return this.allRecords()
            .filter(r => filter === 'all' || r.type === filter)
            .filter(r => !q ||
                (r.name     || '').toLowerCase().includes(q) ||
                (r.goalName || '').toLowerCase().includes(q) ||
                (r.date     || '').includes(q));
    });

    ngOnInit() {
        this.loadData();
        this.subscription = this.stateService.savingsUpdated$.subscribe(() => this.loadData());
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    async loadData() {
        this.loading.set(true);
        try {
            this.goals = await this.savingsService.getGoals();
            this.goalOptions.set(this.goals.map(g => ({ label: g.label, value: g.id || 0 })));

            const data = await this.savingsService.getTransactions();
            const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            this.allRecords.set(sorted.map(r => ({ ...r, goalName: this.getGoalName(r.goalId) })));
        } finally {
            this.loading.set(false);
        }
    }

    private getGoalName(goalId?: number): string | undefined {
        if (!goalId) return undefined;
        return this.goals.find(g => g.id === goalId)?.label;
    }

    openNew() {
        this.record = { date: new Date().toISOString().split('T')[0], type: 'Deposit', amount: 0, name: '', goalId: undefined, goalName: undefined } as SavingRecordWithGoal;
        this.submitted = false;
        this.productDialog = true;
    }

    editRecord(record: SavingRecordWithGoal) {
        this.record = { ...record };
        this.submitted = false;
        this.productDialog = true;
    }

    hideDialog() {
        this.productDialog = false;
        this.submitted = false;
    }

    deleteRecord(record: SavingRecordWithGoal) {
        this.confirmationService.confirm({
            message: `Supprimer ce mouvement ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: '!bg-rose-500 !border-rose-500',
            accept: async () => {
                if (!record.id) return;
                try {
                    await this.savingsService.deleteTransactions([record.id]);
                    this.allRecords.update(rs => rs.filter(r => r.id !== record.id));
                    this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Mouvement supprimé.', life: 3000 });
                    this.stateService.notifySavingsUpdated();
                } catch {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.', life: 4000 });
                }
            }
        });
    }

    async saveRecord() {
        this.submitted = true;
        if (!this.record.date || !(this.record.amount > 0)) return;

        this.isSaving.set(true);
        try {
            this.record.goalName = this.getGoalName(this.record.goalId);

            if (this.record.id) {
                const updated = await this.savingsService.updateTransaction(this.record);
                const withGoal = { ...updated, goalId: this.record.goalId, goalName: this.record.goalName };
                this.allRecords.update(rs => this.sortDesc(rs.map(r => r.id === updated.id ? withGoal : r)));
                this.messageService.add({ severity: 'success', summary: 'Modifié', detail: 'Mouvement mis à jour.', life: 3000 });
            } else {
                const created = await this.savingsService.addTransaction(this.record);
                const withGoal = { ...created, goalId: this.record.goalId, goalName: this.record.goalName };
                this.allRecords.update(rs => this.sortDesc([...rs, withGoal]));
                this.messageService.add({ severity: 'success', summary: 'Enregistré', detail: 'Mouvement ajouté.', life: 3000 });

                if (this.record.goalId && this.record.type === 'Deposit' && this.record.amount > 0) {
                    try { await this.savingsService.addContribution(this.record.goalId, this.record.amount); } catch {}
                }
            }

            this.stateService.notifySavingsUpdated();
            this.productDialog = false;
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible d\'enregistrer.', life: 5000 });
        } finally {
            this.isSaving.set(false);
        }
    }

    private sortDesc(list: SavingRecordWithGoal[]): SavingRecordWithGoal[] {
        return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
}
