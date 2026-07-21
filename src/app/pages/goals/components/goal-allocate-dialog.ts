import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { GoalContributionCreate, LiquidAsset, SavingGoal } from '../../../core/services/api.service';

export type AllocationMode = 'contribute' | 'deallocate';

export interface AllocatePayload {
    mode: AllocationMode;
    body: GoalContributionCreate;
}

@Component({
    selector: 'app-goal-allocate-dialog',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, DialogModule, InputTextModule, InputNumberModule,
        TextareaModule, SelectModule,
    ],
    template: `
        <p-dialog
            [(visible)]="visible"
            (visibleChange)="onVisibleChange($event)"
            [style]="{ width: '95vw', maxWidth: '520px' }"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            styleClass="!rounded-2xl overflow-hidden"
        >
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <!-- Header tile: navy for "into the goal", ochre for "out of the goal", semantic and minimal -->
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                         [ngClass]="mode() === 'contribute'
                            ? 'bg-brand-700 dark:bg-brand-300'
                            : 'bg-ochre-500'">
                        <i class="pi text-white text-lg"
                           [class.dark:text-brand-900]="mode() === 'contribute'"
                           [ngClass]="mode() === 'contribute' ? 'pi-arrow-down' : 'pi-arrow-up'"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ mode() === 'contribute' ? i18n.t('goals.allocate.contributeTitle') : i18n.t('goals.allocate.deallocateTitle') }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">
                            {{ mode() === 'contribute' ? i18n.t('goals.allocate.contributeSub') : i18n.t('goals.allocate.deallocateSub') }}
                        </p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <div class="flex flex-col gap-6 pt-2">

                    <!-- Mode toggle -->
                    <div class="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                        <button
                            type="button"
                            class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                            [class.bg-white]="mode() === 'contribute'"
                            [class.dark:bg-surface-700]="mode() === 'contribute'"
                            [class.shadow]="mode() === 'contribute'"
                            [class.text-positive]="mode() === 'contribute'"
                            [class.text-surface-500]="mode() !== 'contribute'"
                            (click)="mode.set('contribute')"
                        >
                            <i class="pi pi-arrow-down text-xs mr-1.5"></i>
                            {{ i18n.t('goals.allocate.modeContribute') }}
                        </button>
                        <button
                            type="button"
                            class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                            [class.bg-white]="mode() === 'deallocate'"
                            [class.dark:bg-surface-700]="mode() === 'deallocate'"
                            [class.shadow]="mode() === 'deallocate'"
                            [class.text-warning]="mode() === 'deallocate'"
                            [class.text-surface-500]="mode() !== 'deallocate'"
                            (click)="mode.set('deallocate')"
                            [disabled]="!goal || goal.current_amount <= 0"
                            [title]="!goal || goal.current_amount <= 0 ? i18n.t('goals.allocate.deallocateDisabled') : ''"
                        >
                            <i class="pi pi-arrow-up text-xs mr-1.5"></i>
                            {{ i18n.t('goals.allocate.modeDeallocate') }}
                        </button>
                    </div>

                    <!-- Source / destination asset -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            {{ mode() === 'contribute' ? i18n.t('goals.allocate.fromAsset') : i18n.t('goals.allocate.toAsset') }}
                            <span class="text-negative">*</span>
                        </label>
                        @if (assets.length === 0) {
                            <div class="text-sm text-warning-700 dark:text-warning-100 bg-warning-50 dark:bg-warning-700/20 border border-warning-100 dark:border-warning-700/50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                                <i class="pi pi-exclamation-triangle mt-0.5"></i>
                                <span>{{ i18n.t('goals.allocate.noLiquidAssets') }}</span>
                            </div>
                        } @else {
                            <p-select
                                [options]="assets"
                                optionLabel="name"
                                optionValue="id"
                                [(ngModel)]="form.assetId"
                                [placeholder]="i18n.t('goals.allocate.pickAsset')"
                                styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none"
                            >
                                <ng-template let-a #item>
                                    <div class="flex items-center justify-between gap-3 w-full">
                                        <div class="flex flex-col min-w-0">
                                            <span class="text-sm font-medium truncate">{{ a.name }}</span>
                                            <span class="text-xs text-surface-500 truncate">{{ assetCategoryLabel(a.category) }}</span>
                                        </div>
                                        <span class="text-xs font-semibold text-surface-700 dark:text-surface-300 shrink-0">
                                            {{ formatCurrency(a.current_value) }}
                                        </span>
                                    </div>
                                </ng-template>
                                <ng-template let-a #selectedItem>
                                    <span class="text-sm">{{ a.name }}</span>
                                </ng-template>
                            </p-select>
                            @if (submitted() && !form.assetId) {
                                <small class="text-negative text-xs mt-1">
                                    <i class="pi pi-exclamation-circle mr-1"></i>{{ i18n.t('goals.allocate.assetRequired') }}
                                </small>
                            }
                        }
                    </div>

                    <!-- Amount -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            {{ i18n.t('goals.fields.amount') }} <span class="text-surface-400 font-normal">({{ cs.config().symbol }})</span>
                            <span class="text-negative">*</span>
                        </label>
                        <p-inputnumber
                            [(ngModel)]="form.amount"
                            mode="decimal"
                            [minFractionDigits]="0" [maxFractionDigits]="0"
                            [min]="0"
                            [max]="mode() === 'deallocate' && goal ? goal.current_amount : undefined"
                            styleClass="w-full"
                            inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                        />
                        @if (mode() === 'deallocate' && goal) {
                            <small class="text-surface-500 text-xs mt-1">
                                {{ i18n.t('goals.allocate.maxAvailable') }}: {{ formatCurrency(goal.current_amount) }}
                            </small>
                        }
                        @if (submitted() && (!form.amount || form.amount <= 0)) {
                            <small class="text-negative text-xs mt-1">
                                <i class="pi pi-exclamation-circle mr-1"></i>{{ i18n.t('goals.allocate.amountRequired') }}
                            </small>
                        }
                    </div>

                    <!-- Date -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            {{ i18n.t('common.date') }}
                        </label>
                        <input
                            type="date"
                            pInputText
                            [(ngModel)]="form.date"
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                        />
                    </div>

                    <!-- Notes -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            {{ i18n.t('goals.fields.note') }} <span class="text-surface-400 font-normal">({{ i18n.t('common.optional') }})</span>
                        </label>
                        <textarea
                            pTextarea
                            [(ngModel)]="form.notes"
                            rows="2"
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 resize-none"
                        ></textarea>
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col gap-2 w-full pt-2">
                    <p-button
                        [label]="mode() === 'contribute' ? i18n.t('goals.allocate.confirmContribute') : i18n.t('goals.allocate.confirmDeallocate')"
                        icon="pi pi-check"
                        (onClick)="onSubmit()"
                        [loading]="busy"
                        [disabled]="assets.length === 0"
                        [styleClass]="footerBtnClass()"
                    />
                    <p-button
                        [label]="i18n.t('common.cancel')"
                        icon="pi pi-times"
                        [outlined]="true"
                        (onClick)="close()"
                        styleClass="w-full !rounded-full !py-3"
                    />
                </div>
            </ng-template>
        </p-dialog>
    `,
})
export class GoalAllocateDialogComponent {
    @Input() visible = false;
    @Input() busy = false;
    @Input() goal: SavingGoal | null = null;
    @Input() assets: LiquidAsset[] = [];

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() submit = new EventEmitter<AllocatePayload>();

    i18n = inject(I18nService);
    cs = inject(CurrencyService);

    mode = signal<AllocationMode>('contribute');
    submitted = signal(false);

    form = {
        assetId: null as number | null,
        amount: null as number | null,
        date: new Date().toISOString().slice(0, 10),
        notes: '',
    };

    footerBtnClass = computed(() =>
        this.mode() === 'contribute'
            ? 'w-full omaad-cta !rounded-full !py-3'
            : 'w-full omaad-accent !rounded-full !py-3'
    );

    private resetForm() {
        this.form = {
            assetId: null,
            amount: null,
            date: new Date().toISOString().slice(0, 10),
            notes: '',
        };
        this.mode.set('contribute');
        this.submitted.set(false);
    }

    onVisibleChange(v: boolean) {
        this.visible = v;
        this.visibleChange.emit(v);
        if (!v) this.resetForm();
    }

    close() {
        this.onVisibleChange(false);
    }

    onSubmit() {
        this.submitted.set(true);
        if (!this.form.assetId || !this.form.amount || this.form.amount <= 0) return;
        this.submit.emit({
            mode: this.mode(),
            body: {
                asset_id: this.form.assetId,
                amount: this.form.amount,
                date: this.form.date || undefined,
                notes: this.form.notes?.trim() || undefined,
            },
        });
    }

    assetCategoryLabel(category: string): string {
        const k = `patrimoine.category.${category}`;
        const v = this.i18n.t(k);
        return v === k ? category : v;
    }

    formatCurrency(v: number): string {
        const sym = this.cs.config().symbol;
        return `${sym}${v.toLocaleString(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}`;
    }
}
