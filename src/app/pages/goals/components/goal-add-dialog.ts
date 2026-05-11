import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { SavingGoal, SavingGoalCreate, SavingGoalUpdate } from '../../../core/services/api.service';
import { GOAL_TEMPLATES, GoalTemplate, GoalTemplateKey, templateOf } from '../goal-templates';
import { fileToCompressedDataUrl } from '../image-resize';

interface GoalForm {
    name: string;
    target_amount: number | null;
    current_amount: number | null;
    target_date: string | null;
    description: string;
    /** Resolved image to display: either a user-supplied URL/data URL, or empty (template fallback). */
    imageUrl: string;
    templateKey: GoalTemplateKey;
}

export interface GoalSavePayload {
    create?: SavingGoalCreate;
    update?: { id: number; patch: SavingGoalUpdate };
}

@Component({
    selector: 'app-goal-add-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, TextareaModule],
    template: `
        <p-dialog
            [(visible)]="visible"
            (visibleChange)="onVisibleChange($event)"
            [style]="{ width: '95vw', maxWidth: '640px' }"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            styleClass="!rounded-2xl overflow-hidden"
        >
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-brand-700 dark:bg-brand-300 flex items-center justify-center shadow-card">
                        <i class="pi pi-flag text-white dark:text-brand-900 text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ editing ? i18n.t('goals.dialog.editTitle') : i18n.t('goals.dialog.addTitle') }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">
                            {{ step() === 1 ? i18n.t('goals.dialog.step1Sub') : i18n.t('goals.dialog.step2Sub') }}
                        </p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <!-- STEP 1: pick a template -->
                @if (step() === 1) {
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        @for (tpl of templates; track tpl.key) {
                            <button
                                type="button"
                                (click)="pickTemplate(tpl)"
                                class="group rounded-xl overflow-hidden border-2 transition-all duration-200 text-left bg-white dark:bg-surface-800 hover:shadow-lg"
                                [class.border-brand-700]="form.templateKey === tpl.key"
                                [class.dark:border-brand-300]="form.templateKey === tpl.key"
                                [class.border-surface-200]="form.templateKey !== tpl.key"
                                [class.dark:border-surface-700]="form.templateKey !== tpl.key"
                            >
                                <div class="relative h-20 bg-surface-100 dark:bg-surface-900 overflow-hidden">
                                    <img [src]="tpl.image" [alt]="i18n.t(tpl.nameKey)" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                    @if (form.templateKey === tpl.key) {
                                        <div class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-700 dark:bg-brand-300 flex items-center justify-center shadow-md">
                                            <i class="pi pi-check text-white text-[10px]"></i>
                                        </div>
                                    }
                                </div>
                                <div class="p-2.5 flex items-center gap-2">
                                    <i [class]="tpl.icon + ' text-surface-500 text-sm'"></i>
                                    <span class="text-xs font-medium text-surface-900 dark:text-surface-0 truncate">{{ i18n.t(tpl.nameKey) }}</span>
                                </div>
                            </button>
                        }
                    </div>
                }

                <!-- STEP 2: configure -->
                @if (step() === 2) {
                    <div class="flex flex-col gap-6 pt-2">

                        <!-- Image preview banner with replace button -->
                        <div class="relative h-32 rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-900">
                            <img [src]="effectiveImage()" [alt]="form.name" class="w-full h-full object-cover" (error)="onImageError()" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

                            <div class="absolute top-2 left-2 flex gap-2">
                                @if (!editing) {
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-surface-800/90 backdrop-blur text-surface-900 dark:text-surface-0 hover:bg-white dark:hover:bg-surface-800 shadow-md"
                                        (click)="step.set(1)"
                                    >
                                        <i class="pi pi-images text-[10px]"></i>
                                        {{ i18n.t('goals.dialog.changeTemplate') }}
                                    </button>
                                }
                                <button
                                    type="button"
                                    class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-surface-800/90 backdrop-blur text-surface-900 dark:text-surface-0 hover:bg-white dark:hover:bg-surface-800 shadow-md"
                                    [disabled]="uploading()"
                                    (click)="fileInput.click()"
                                >
                                    @if (uploading()) {
                                        <i class="pi pi-spin pi-spinner text-[10px]"></i>
                                    } @else {
                                        <i class="pi pi-upload text-[10px]"></i>
                                    }
                                    {{ i18n.t('goals.dialog.uploadImage') }}
                                </button>
                                @if (form.imageUrl) {
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-surface-800/90 backdrop-blur text-negative hover:bg-white dark:hover:bg-surface-800 shadow-md"
                                        (click)="clearCustomImage()"
                                        [title]="i18n.t('goals.dialog.removeCustomImage')"
                                    >
                                        <i class="pi pi-times text-[10px]"></i>
                                    </button>
                                }
                            </div>

                            <input
                                #fileInput
                                type="file"
                                accept="image/*"
                                class="hidden"
                                (change)="onFileSelected($event)"
                            />
                        </div>

                        @if (uploadError()) {
                            <small class="text-negative text-xs -mt-2">
                                <i class="pi pi-exclamation-circle mr-1"></i>{{ uploadError() }}
                            </small>
                        }

                        <!-- Name -->
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ i18n.t('goals.fields.name') }} <span class="text-negative">*</span>
                            </label>
                            <input
                                pInputText
                                [(ngModel)]="form.name"
                                [placeholder]="i18n.t('goals.fields.namePlaceholder')"
                                class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                            />
                            @if (submitted() && !form.name.trim()) {
                                <small class="text-negative text-xs mt-1">
                                    <i class="pi pi-exclamation-circle mr-1"></i>{{ i18n.t('goals.fields.nameRequired') }}
                                </small>
                            }
                        </div>

                        <!-- Target amount -->
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ i18n.t('goals.fields.targetAmount') }} <span class="text-surface-400 font-normal">({{ cs.config().symbol }})</span>
                            </label>
                            <p-inputnumber
                                [(ngModel)]="form.target_amount"
                                mode="decimal"
                                [minFractionDigits]="0" [maxFractionDigits]="0"
                                styleClass="w-full"
                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                            />
                        </div>

                        <!-- Current amount -->
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ i18n.t('goals.fields.currentAmount') }} <span class="text-surface-400 font-normal">({{ i18n.t('common.optional') }} · {{ cs.config().symbol }})</span>
                            </label>
                            <p-inputnumber
                                [(ngModel)]="form.current_amount"
                                mode="decimal"
                                [minFractionDigits]="0" [maxFractionDigits]="0"
                                styleClass="w-full"
                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                            />
                        </div>

                        <!-- Target date -->
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ i18n.t('goals.fields.targetDate') }} <span class="text-surface-400 font-normal">({{ i18n.t('common.optional') }})</span>
                            </label>
                            <input
                                type="date"
                                pInputText
                                [ngModel]="form.target_date"
                                (ngModelChange)="form.target_date = $event"
                                class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                            />
                        </div>

                        <!-- Custom image URL (alternative to upload) -->
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ i18n.t('goals.fields.imageUrl') }} <span class="text-surface-400 font-normal">({{ i18n.t('common.optional') }})</span>
                            </label>
                            <input
                                pInputText
                                [(ngModel)]="form.imageUrl"
                                placeholder="https://..."
                                class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                            />
                            <small class="text-surface-400 text-xs mt-1">{{ i18n.t('goals.fields.imageUrlHint') }}</small>
                        </div>

                        <!-- Note -->
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ i18n.t('goals.fields.note') }} <span class="text-surface-400 font-normal">({{ i18n.t('common.optional') }})</span>
                            </label>
                            <textarea
                                pTextarea
                                [(ngModel)]="form.description"
                                rows="2"
                                class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 resize-none"
                            ></textarea>
                        </div>
                    </div>
                }
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col gap-2 w-full pt-2">
                    @if (step() === 1) {
                        <p-button
                            [label]="i18n.t('goals.dialog.next')"
                            icon="pi pi-arrow-right"
                            iconPos="right"
                            (onClick)="step.set(2)"
                            [disabled]="!form.templateKey"
                            styleClass="w-full omaad-cta !rounded-full !py-3"
                        />
                        <p-button
                            [label]="i18n.t('common.cancel')"
                            icon="pi pi-times"
                            [outlined]="true"
                            (onClick)="close()"
                            styleClass="w-full !rounded-full !py-3"
                        />
                    } @else {
                        <p-button
                            [label]="editing ? i18n.t('common.save') : i18n.t('goals.dialog.create')"
                            icon="pi pi-check"
                            (onClick)="onSave()"
                            [loading]="saving"
                            styleClass="w-full omaad-cta !rounded-full !py-3"
                        />
                        <p-button
                            [label]="editing ? i18n.t('common.cancel') : i18n.t('goals.dialog.back')"
                            [icon]="editing ? 'pi pi-times' : 'pi pi-arrow-left'"
                            [outlined]="true"
                            (onClick)="editing ? close() : step.set(1)"
                            styleClass="w-full !rounded-full !py-3"
                        />
                    }
                </div>
            </ng-template>
        </p-dialog>
    `,
})
export class GoalAddDialogComponent {
    @Input() visible = false;
    @Input() saving = false;
    @Input() set existingGoal(g: SavingGoal | null) {
        if (g) {
            this.editing = true;
            this.editingId = g.id;
            this.form = {
                name: g.name,
                target_amount: g.target_amount,
                current_amount: g.current_amount,
                target_date: g.target_date,
                description: g.description ?? '',
                imageUrl: g.image_url ?? '',
                templateKey: (g.template_key as GoalTemplateKey) ?? 'custom',
            };
            this.step.set(2);
        } else {
            this.editing = false;
            this.editingId = null;
            this.resetForm();
        }
    }

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() save = new EventEmitter<GoalSavePayload>();

    @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

    i18n = inject(I18nService);
    cs = inject(CurrencyService);

    templates: GoalTemplate[] = GOAL_TEMPLATES;
    step = signal<1 | 2>(1);
    submitted = signal(false);
    uploading = signal(false);
    uploadError = signal<string | null>(null);

    editing = false;
    editingId: number | null = null;

    form: GoalForm = this.makeBlankForm();

    private makeBlankForm(): GoalForm {
        return {
            name: '',
            target_amount: null,
            current_amount: 0,
            target_date: null,
            description: '',
            imageUrl: '',
            templateKey: 'custom',
        };
    }

    private resetForm() {
        this.form = this.makeBlankForm();
        this.step.set(1);
        this.submitted.set(false);
        this.uploading.set(false);
        this.uploadError.set(null);
    }

    pickTemplate(tpl: GoalTemplate) {
        this.form.templateKey = tpl.key;
        // Pre-fill name with the template's localized default if user hasn't typed anything
        if (!this.form.name?.trim()) {
            this.form.name = this.i18n.t(tpl.defaultNameKey);
        }
        this.step.set(2);
    }

    effectiveImage(): string {
        return this.form.imageUrl?.trim() || templateOf(this.form.templateKey).image;
    }

    onImageError() {
        this.form.imageUrl = '';
    }

    clearCustomImage() {
        this.form.imageUrl = '';
        if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
    }

    async onFileSelected(ev: Event) {
        const input = ev.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.uploadError.set(null);
        this.uploading.set(true);
        try {
            const dataUrl = await fileToCompressedDataUrl(file);
            this.form.imageUrl = dataUrl;
        } catch (err: any) {
            console.error('Image upload failed', err);
            this.uploadError.set(this.i18n.t('goals.dialog.uploadError'));
        } finally {
            this.uploading.set(false);
            // reset input so picking the same file again still triggers (change)
            if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
        }
    }

    onVisibleChange(v: boolean) {
        this.visible = v;
        this.visibleChange.emit(v);
        if (!v) this.resetForm();
    }

    close() {
        this.onVisibleChange(false);
    }

    onSave() {
        this.submitted.set(true);
        if (!this.form.name?.trim()) return;

        const targetAmount = this.form.target_amount ?? 0;
        const currentAmount = this.form.current_amount ?? 0;
        const imageUrl = this.form.imageUrl?.trim() || undefined;
        const description = this.form.description?.trim() || undefined;

        if (this.editing && this.editingId != null) {
            this.save.emit({
                update: {
                    id: this.editingId,
                    patch: {
                        name: this.form.name.trim(),
                        target_amount: targetAmount,
                        current_amount: currentAmount,
                        target_date: this.form.target_date || undefined,
                        template_key: this.form.templateKey,
                        image_url: imageUrl,
                        description,
                    },
                },
            });
        } else {
            this.save.emit({
                create: {
                    name: this.form.name.trim(),
                    target_amount: targetAmount,
                    current_amount: currentAmount,
                    target_date: this.form.target_date || undefined,
                    template_key: this.form.templateKey,
                    image_url: imageUrl,
                    description,
                },
            });
        }
    }
}
