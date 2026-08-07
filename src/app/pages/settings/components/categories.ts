import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { I18nService } from '../../../i18n/i18n.service';
import { CustomCategory, CustomCategoryKind } from '../../../core/services/api.service';
import { CustomCategoryService } from '../../../core/services/custom-category.service';

/**
 * Settings → Categories (S13 PRO-4). Built to the settings-redesign bar
 * (subscription/preferences pages): live preview as the signature object, a
 * segmented kind control, quiet underline input, ochre selection states and
 * gradient CTA, grouped list with tinted icon tiles, teaching empty state with
 * one-tap suggestions. Retiring a category is a soft delete, so past
 * transactions keep their label.
 */
@Component({
    selector: 'app-settings-categories',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogModule, ToastModule],
    providers: [ConfirmationService, MessageService],
    template: `
        <p-toast position="top-center" />
        <p-confirmDialog [style]="{ width: '92vw', maxWidth: '420px' }" styleClass="!rounded-2xl" appendTo="body" />

        <div class="max-w-2xl mx-auto pb-12">
            <h2 class="hidden lg:block text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.categories.title') }}</h2>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">{{ t('settings.categories.subtitle') }}</p>

            @if (!svc.ready()) {
                <div class="rounded-2xl h-72 bg-surface-100 dark:bg-surface-800/60 animate-pulse mb-5"></div>
                <div class="rounded-2xl h-32 bg-surface-100 dark:bg-surface-800/60 animate-pulse"></div>
            } @else {

            <!-- ═══════ COMPOSER ═══════ -->
            <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 mb-5">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">
                        {{ editingId() ? t('settings.categories.editTitle') : t('settings.categories.addTitle') }}
                    </h3>
                    @if (editingId()) {
                        <button type="button" (click)="resetForm()"
                                class="omaad-press text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200">
                            {{ t('common.cancel') }}
                        </button>
                    }
                </div>

                <!-- Live preview: the chip exactly as it renders in pickers -->
                <div class="flex items-center justify-center rounded-xl border border-dashed border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/40 py-6 mb-6"
                     aria-hidden="true">
                    <div class="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-0 dark:bg-surface-900 shadow-sm border border-surface-200/80 dark:border-surface-700/60">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                             [style.background]="form.color + '20'">
                            <i [class]="form.icon" class="text-lg transition-colors" [style.color]="form.color"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="font-semibold text-[15px] leading-tight truncate max-w-[180px]"
                               [class.text-surface-900]="!!form.label.trim()" [class.dark:text-surface-0]="!!form.label.trim()"
                               [class.text-surface-400]="!form.label.trim()" [class.dark:text-surface-500]="!form.label.trim()">
                                {{ form.label.trim() || t('settings.categories.previewPlaceholder') }}
                            </p>
                            <p class="text-[11px] text-surface-400 dark:text-surface-500">
                                {{ form.kind === 'income' ? t('settings.categories.income') : t('settings.categories.expense') }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Name + kind -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label for="cat-name" class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">
                            {{ t('settings.categories.name') }}
                        </label>
                        <input id="cat-name" type="text" [(ngModel)]="form.label" maxlength="50"
                               [placeholder]="t('settings.categories.labelPlaceholder')"
                               class="w-full bg-transparent border-0 border-b border-surface-300 dark:border-surface-600 focus:border-ochre-500 dark:focus:border-ochre-400 focus:outline-none py-2 text-[15px] text-surface-900 dark:text-surface-0 placeholder:text-surface-400 dark:placeholder:text-surface-500 rounded-none" />
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">
                            {{ t('settings.categories.type') }}
                        </label>
                        <div class="inline-flex p-1 rounded-full bg-surface-100 dark:bg-surface-800 gap-1"
                             [class.opacity-60]="editingId() !== null" role="radiogroup">
                            <button type="button" role="radio" [attr.aria-checked]="form.kind === 'expense'"
                                    (click)="setKind('expense')" [disabled]="editingId() !== null"
                                    class="omaad-press px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                                    [ngClass]="form.kind === 'expense'
                                        ? 'bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 shadow-sm'
                                        : 'text-surface-500 dark:text-surface-400'">
                                {{ t('settings.categories.expense') }}
                            </button>
                            <button type="button" role="radio" [attr.aria-checked]="form.kind === 'income'"
                                    (click)="setKind('income')" [disabled]="editingId() !== null"
                                    class="omaad-press px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                                    [ngClass]="form.kind === 'income'
                                        ? 'bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 shadow-sm'
                                        : 'text-surface-500 dark:text-surface-400'">
                                {{ t('settings.categories.income') }}
                            </button>
                        </div>
                        @if (editingId() !== null) {
                            <p class="text-[11px] text-surface-400 dark:text-surface-500 mt-1.5">{{ t('settings.categories.kindLocked') }}</p>
                        }
                    </div>
                </div>

                <!-- Icon -->
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">
                    {{ t('settings.categories.icon') }}
                </label>
                <div class="flex flex-wrap gap-2 mb-6">
                    @for (ic of ICONS; track ic) {
                        <button type="button" (click)="form.icon = ic" [attr.aria-label]="ic" [attr.aria-pressed]="form.icon === ic"
                                class="omaad-press w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
                                [ngClass]="form.icon === ic
                                    ? 'border-ochre-500 ring-2 ring-ochre-500/20 bg-ochre-500/[0.06]'
                                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-surface-50 dark:bg-surface-800/60'">
                            <i [class]="ic" [style.color]="form.icon === ic ? form.color : ''"
                               class="text-surface-500 dark:text-surface-400"></i>
                        </button>
                    }
                </div>

                <!-- Color -->
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">
                    {{ t('settings.categories.color') }}
                </label>
                <div class="flex flex-wrap gap-2.5 mb-7">
                    @for (col of COLORS; track col) {
                        <button type="button" (click)="form.color = col" [attr.aria-label]="col" [attr.aria-pressed]="form.color === col"
                                [style.background]="col"
                                class="omaad-press w-8 h-8 rounded-full flex items-center justify-center transition-transform"
                                [ngClass]="form.color === col ? 'ring-2 ring-offset-2 ring-surface-400 dark:ring-surface-500 dark:ring-offset-surface-900 scale-110' : ''">
                            @if (form.color === col) {
                                <i class="pi pi-check text-white !text-[11px]" aria-hidden="true"></i>
                            }
                        </button>
                    }
                </div>

                <button type="button" (click)="saveCategory()" [disabled]="!form.label.trim() || busy()"
                        class="omaad-press inline-flex items-center gap-2 rounded-full py-2.5 px-6 font-bold text-warm-900 bg-gradient-to-r from-ochre-400 to-ochre-500 shadow-sm disabled:opacity-50 transition-opacity">
                    <i class="pi shrink-0" [ngClass]="busy() ? 'pi-spin pi-spinner' : (editingId() ? 'pi-check' : 'pi-plus')" style="font-size: 13px" aria-hidden="true"></i>
                    {{ editingId() ? t('common.save') : t('settings.categories.add') }}
                </button>
            </section>

            <!-- ═══════ LIST / EMPTY STATE ═══════ -->
            @if (!svc.categories().length) {
                <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-ochre-500/10 flex items-center justify-center mx-auto mb-3">
                        <i class="pi pi-tags text-ochre-500 text-xl" aria-hidden="true"></i>
                    </div>
                    <p class="font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.categories.emptyTitle') }}</p>
                    <p class="text-sm text-surface-500 dark:text-surface-400 mb-5 max-w-[38ch] mx-auto">{{ t('settings.categories.emptyBody') }}</p>
                    <div class="flex flex-wrap justify-center gap-2">
                        @for (s of SUGGESTIONS; track s.label) {
                            <button type="button" (click)="applySuggestion(s)"
                                    class="omaad-press inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-surface-200 dark:border-surface-700 hover:border-ochre-500/60 text-sm font-medium text-surface-700 dark:text-surface-200 transition-colors">
                                <i [class]="s.icon" [style.color]="s.color" style="font-size: 13px" aria-hidden="true"></i>
                                {{ s.label }}
                            </button>
                        }
                    </div>
                </section>
            } @else {
                @for (group of groups(); track group.kind) {
                    @if (group.items.length) {
                        <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm px-5 md:px-6 py-2 mb-5">
                            <div class="flex items-center justify-between pt-3.5 pb-1">
                                <h3 class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                                    {{ t('settings.categories.' + group.kind) }}
                                </h3>
                                <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 tabular-nums">
                                    {{ group.items.length }}
                                </span>
                            </div>
                            <div class="divide-y divide-surface-100 dark:divide-surface-800">
                                @for (c of group.items; track c.id) {
                                    <div class="group flex items-center gap-3 py-3.5 -mx-2 px-2 rounded-xl transition-colors"
                                         [ngClass]="editingId() === c.id ? 'bg-ochre-500/[0.05]' : ''">
                                        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                             [style.background]="(c.color || '#8A98AE') + '20'">
                                            <i [class]="c.icon || 'pi pi-tag'" [style.color]="c.color || '#8A98AE'" aria-hidden="true"></i>
                                        </div>
                                        <span class="flex-1 font-medium text-[15px] text-surface-900 dark:text-surface-0 truncate">{{ c.label }}</span>
                                        <button type="button" (click)="edit(c)" [attr.aria-label]="t('common.edit')"
                                                class="omaad-press w-9 h-9 rounded-full flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                                            <i class="pi pi-pencil !text-[13px]" aria-hidden="true"></i>
                                        </button>
                                        <button type="button" (click)="confirmRemove(c)" [attr.aria-label]="t('common.delete')"
                                                class="omaad-press w-9 h-9 rounded-full flex items-center justify-center text-surface-400 hover:text-negative hover:bg-negative/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                                            <i class="pi pi-trash !text-[13px]" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                }
                            </div>
                        </section>
                    }
                }
            }
            }
        </div>
    `
})
export class CategoriesSettings implements OnInit {
    private i18n = inject(I18nService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    svc = inject(CustomCategoryService);

    readonly ICONS = [
        'pi pi-tag', 'pi pi-home', 'pi pi-car', 'pi pi-heart', 'pi pi-book',
        'pi pi-gift', 'pi pi-shopping-bag', 'pi pi-wallet', 'pi pi-briefcase',
        'pi pi-star', 'pi pi-users', 'pi pi-bolt', 'pi pi-mobile', 'pi pi-globe',
        'pi pi-moon', 'pi pi-sun', 'pi pi-truck', 'pi pi-wrench', 'pi pi-camera', 'pi pi-palette',
    ];
    readonly COLORS = [
        '#C77B3C', '#1A2740', '#2E7D5B', '#B23A48', '#6D4C91',
        '#3C7DC7', '#C7A23C', '#8A98AE', '#B2673A', '#3CA0A0',
    ];
    /** Teaching empty state: one-tap, locally relevant starters. */
    readonly SUGGESTIONS: { label: string; kind: CustomCategoryKind; icon: string; color: string }[] = [
        { label: 'Daara',  kind: 'expense', icon: 'pi pi-book', color: '#6D4C91' },
        { label: 'Ndogou', kind: 'expense', icon: 'pi pi-moon', color: '#2E7D5B' },
        { label: 'Sport',  kind: 'expense', icon: 'pi pi-bolt', color: '#B23A48' },
    ];

    editingId = signal<number | null>(null);
    busy = signal(false);
    form: { label: string; kind: CustomCategoryKind; icon: string; color: string } = {
        label: '', kind: 'expense', icon: this.ICONS[0], color: this.COLORS[0],
    };

    readonly groups = computed(() => [
        { kind: 'expense', items: this.svc.expense() },
        { kind: 'income', items: this.svc.income() },
    ]);

    ngOnInit() { this.svc.load(true); }

    setKind(kind: CustomCategoryKind) {
        if (this.editingId() !== null) return; // kind is immutable on an existing category
        this.form.kind = kind;
    }

    applySuggestion(s: { label: string; kind: CustomCategoryKind; icon: string; color: string }) {
        this.editingId.set(null);
        this.form = { label: s.label, kind: s.kind, icon: s.icon, color: s.color };
    }

    resetForm() {
        this.editingId.set(null);
        this.form = { label: '', kind: 'expense', icon: this.ICONS[0], color: this.COLORS[0] };
    }

    edit(c: CustomCategory) {
        this.editingId.set(c.id);
        this.form = { label: c.label, kind: c.kind, icon: c.icon || this.ICONS[0], color: c.color || this.COLORS[0] };
    }

    saveCategory() {
        const label = this.form.label.trim();
        if (!label || this.busy()) return;
        this.busy.set(true);
        const payload = { label, kind: this.form.kind, icon: this.form.icon, color: this.form.color };
        const id = this.editingId();
        const req = id !== null
            ? this.svc.update(id, { label: payload.label, icon: payload.icon, color: payload.color })
            : this.svc.create(payload);
        req.subscribe({
            next: () => {
                this.busy.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: id !== null ? this.t('settings.categories.updated') : this.t('settings.categories.added', { label }),
                    life: 3000,
                });
                this.resetForm();
            },
            error: (e) => {
                this.busy.set(false);
                const msg = e?.status === 409 ? this.t('settings.categories.duplicate')
                    : e?.status === 403 ? this.t('settings.categories.proOnly')
                    : this.t('settings.categories.saveError');
                this.messageService.add({ severity: 'error', summary: msg, life: 4000 });
            },
        });
    }

    confirmRemove(c: CustomCategory) {
        this.confirmationService.confirm({
            header: this.t('settings.categories.deleteTitle'),
            message: this.t('settings.categories.deleteBody', { label: c.label }),
            acceptLabel: this.t('common.delete'),
            rejectLabel: this.t('common.cancel'),
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.remove(c),
        });
    }

    private remove(c: CustomCategory) {
        this.svc.remove(c.id).subscribe({
            next: () => {
                if (this.editingId() === c.id) this.resetForm();
                this.messageService.add({
                    severity: 'success', summary: this.t('settings.categories.deleted', { label: c.label }), life: 3000,
                });
            },
            error: () => this.messageService.add({
                severity: 'error', summary: this.t('settings.categories.saveError'), life: 4000,
            }),
        });
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
