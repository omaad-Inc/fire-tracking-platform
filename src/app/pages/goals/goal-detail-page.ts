import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { I18nService } from '../../i18n/i18n.service';
import {
    ApiService,
    GoalContribution,
    LiquidAsset,
    SavingGoal,
} from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { NavService } from '../../core/services/nav.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { AssetsStateService } from '../service/assets-state.service';
import { GoalAddDialogComponent, GoalSavePayload } from './components/goal-add-dialog';
import { GoalAllocateDialogComponent, AllocatePayload } from './components/goal-allocate-dialog';
import { templateOf } from './goal-templates';
import { computeStatus, monthlyContributionNeeded, monthsRemaining, progressPercent, templateKeyOf } from './goal-utils';

@Component({
    selector: 'app-goal-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule, ToastModule, ConfirmDialogModule, DialogModule,
        AppAmountComponent, GoalAddDialogComponent, GoalAllocateDialogComponent,
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="flex flex-col gap-6">

            <!-- Breadcrumb / actions -->
            <div class="flex items-center justify-between gap-4 flex-wrap">
                <div class="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                    <button
                        type="button"
                        (click)="back()"
                        class="inline-flex items-center gap-1.5 hover:text-surface-900 dark:hover:text-surface-0 transition-colors"
                    >
                        <i class="pi pi-arrow-left text-xs"></i>
                        {{ i18n.t('goals.title') }}
                    </button>
                    <i class="pi pi-angle-right text-[10px]"></i>
                    <span class="text-surface-900 dark:text-surface-0 font-medium truncate">{{ goal()?.name || '...' }}</span>
                </div>
                @if (goal() && !share.active()) {
                    <div class="flex flex-wrap gap-2">
                        <p-button
                            [label]="i18n.t('goals.detail.allocateFunds')"
                            icon="pi pi-arrow-right-arrow-left"
                            (onClick)="openAllocate()"
                            styleClass="omaad-cta !rounded-xl"
                        />
                        <p-button
                            [label]="i18n.t('common.edit')"
                            icon="pi pi-pencil"
                            [outlined]="true"
                            (onClick)="openEdit()"
                            styleClass="!rounded-xl !border-surface-300 dark:!border-surface-600"
                        />
                        <p-button
                            icon="pi pi-share-alt"
                            [outlined]="true"
                            (onClick)="openShare()"
                            [attr.aria-label]="i18n.t('goals.share.button')"
                            styleClass="!rounded-xl !border-surface-300 dark:!border-surface-600"
                        />
                        <p-button
                            icon="pi pi-trash"
                            [outlined]="true"
                            severity="danger"
                            (onClick)="confirmDelete()"
                            styleClass="!rounded-xl !border-negative-100 dark:!border-negative-700"
                        />
                    </div>
                }
            </div>

            <!-- Loading -->
            @if (loading()) {
                <div class="animate-pulse bg-surface-100 dark:bg-surface-800 rounded-2xl h-72"></div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    @for (i of [1,2,3,4]; track i) {
                        <div class="animate-pulse bg-surface-100 dark:bg-surface-800 rounded-2xl h-24"></div>
                    }
                </div>
            }

            <!-- Not found -->
            @if (!loading() && !goal()) {
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 text-center py-12">
                    <div class="relative w-16 h-16 mx-auto rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                        <i class="pi pi-flag text-2xl text-surface-400"></i>
                    </div>
                    <h2 class="relative text-lg font-semibold text-surface-900 dark:text-surface-0 mb-2">{{ i18n.t('goals.detail.notFound') }}</h2>
                    <p class="relative text-surface-500 dark:text-surface-400 text-sm mb-4">{{ i18n.t('goals.detail.notFoundDesc') }}</p>
                    <p-button
                        [label]="i18n.t('goals.detail.backToList')"
                        icon="pi pi-arrow-left"
                        (onClick)="back()"
                        styleClass="!rounded-xl"
                    />
                </div>
            }

            @if (!loading() && goal(); as g) {
                <!-- HERO -->
                <div class="relative rounded-2xl overflow-hidden bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                    <div class="relative h-56 sm:h-72 lg:h-80">
                        <img [src]="heroImage()" [alt]="g.name" class="w-full h-full object-cover" (error)="onHeroError()" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"></div>
                        <span class="absolute top-4 right-4 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm" [ngClass]="badgeClass()">
                            <i [class]="badgeIcon() + ' text-[11px]'"></i>
                            {{ i18n.t('goals.status.' + statusKey()) }}
                        </span>
                    </div>

                    <div class="absolute left-3 right-3 bottom-3 sm:left-5 sm:right-5 sm:bottom-5 bg-white/95 dark:bg-surface-900/95 backdrop-blur rounded-xl p-4 sm:p-5 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-100 dark:bg-brand-700/20">
                                    <i [class]="template().icon + ' text-brand-700 dark:text-ochre-400 text-base'"></i>
                                </div>
                                <div class="min-w-0">
                                    <h1 class="text-lg sm:text-xl font-bold text-surface-900 dark:text-surface-0 m-0 truncate">{{ g.name }}</h1>
                                    <p class="text-xs text-surface-500 dark:text-surface-400 m-0">{{ formattedDate() || i18n.t('goals.detail.noDeadline') }}</p>
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                <div class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 leading-none">
                                    <app-amount [value]="g.current_amount" />
                                </div>
                                @if (g.target_amount > 0) {
                                    <div class="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                        {{ percent() }}% {{ i18n.t('goals.outOf') }} <app-amount [value]="g.target_amount" />
                                    </div>
                                }
                            </div>
                        </div>
                        @if (g.target_amount > 0) {
                            <div class="mt-3 relative h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-500" [ngClass]="barClass()" [style.width.%]="percent()"></div>
                            </div>
                        }
                    </div>
                </div>

                <!-- KPI strip -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-full min-h-[96px] flex flex-col justify-center text-center sm:text-left">
                        <div class="relative text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 truncate">
                            <app-amount [value]="g.current_amount" />
                        </div>
                        <div class="relative text-xs text-surface-500 dark:text-surface-400 mt-1 truncate">{{ i18n.t('goals.kpi.totalSaved') }}</div>
                    </div>
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-full min-h-[96px] flex flex-col justify-center text-center sm:text-left">
                        <div class="relative text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 truncate">
                            @if (remaining() != null) {
                                <app-amount [value]="remaining()!" />
                            } @else {
                                —
                            }
                        </div>
                        <div class="relative text-xs text-surface-500 dark:text-surface-400 mt-1 truncate">{{ i18n.t('goals.kpi.leftToSave') }}</div>
                    </div>
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-full min-h-[96px] flex flex-col justify-center text-center sm:text-left">
                        <div class="relative text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 truncate">
                            @if (monthlyNeeded() != null) {
                                <app-amount [value]="monthlyNeeded()!" />
                            } @else {
                                —
                            }
                        </div>
                        <div class="relative text-xs text-surface-500 dark:text-surface-400 mt-1 truncate">{{ i18n.t('goals.detail.monthlyNeeded') }}</div>
                    </div>
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-full min-h-[96px] flex flex-col justify-center text-center sm:text-left">
                        <div class="relative text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 truncate">
                            @if (monthsLeft() != null) {
                                {{ monthsLeft() }}
                            } @else {
                                —
                            }
                        </div>
                        <div class="relative text-xs text-surface-500 dark:text-surface-400 mt-1 truncate">{{ i18n.t('goals.detail.monthsLeft') }}</div>
                    </div>
                </div>

                <!-- Two-column body -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    <!-- LEFT — main column: Activity + (optional) note -->
                    <div class="lg:col-span-2 flex flex-col gap-4">

                        <!-- Activity log -->
                        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
                            <div class="relative flex items-center justify-between gap-2 mb-4">
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-history text-brand-700 dark:text-ochre-400"></i>
                                    <h3 class="font-semibold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('goals.activity.title') }}</h3>
                                </div>
                                @if (contributions().length > 0) {
                                    <span class="text-xs text-surface-500 dark:text-surface-400">
                                        {{ contributions().length }}
                                        {{ contributions().length === 1 ? i18n.t('goals.activity.entrySingular') : i18n.t('goals.activity.entryPlural') }}
                                    </span>
                                }
                            </div>

                            @if (loadingContributions()) {
                                <div class="relative flex flex-col gap-2">
                                    @for (i of [1,2,3]; track i) {
                                        <div class="animate-pulse bg-surface-100 dark:bg-surface-800 rounded-xl h-14"></div>
                                    }
                                </div>
                            } @else if (contributions().length === 0) {
                                <div class="relative flex flex-col items-center justify-center py-8 text-center">
                                    <div class="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                                        <i class="pi pi-history text-surface-400"></i>
                                    </div>
                                    <p class="text-sm text-surface-500 dark:text-surface-400 m-0 mb-3">{{ i18n.t('goals.activity.empty') }}</p>
                                    <p-button
                                        *ngIf="!share.active()"
                                        [label]="i18n.t('goals.detail.allocateFunds')"
                                        icon="pi pi-plus"
                                        size="small"
                                        (onClick)="openAllocate()"
                                        styleClass="!rounded-xl"
                                    />
                                </div>
                            } @else {
                                <ul class="relative flex flex-col divide-y divide-surface-200 dark:divide-surface-800">
                                    @for (c of contributions(); track c.id) {
                                        <li class="py-3 flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                 [ngClass]="c.type === 'contribution' ? 'bg-positive-50 dark:bg-positive-500/15' : 'bg-warning-50 dark:bg-warning-500/15'">
                                                <i class="pi text-sm"
                                                   [ngClass]="c.type === 'contribution' ? 'pi-arrow-down text-positive-600 dark:text-positive-400' : 'pi-arrow-up text-warning-600 dark:text-warning-400'"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 text-sm font-medium text-surface-900 dark:text-surface-0">
                                                    <span class="truncate">{{ c.asset_name || i18n.t('goals.activity.unknownSource') }}</span>
                                                    <span class="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                                                          [ngClass]="c.type === 'contribution' ? 'bg-positive-50 dark:bg-positive-500/15 text-positive-700 dark:text-positive-400' : 'bg-warning-50 dark:bg-warning-500/15 text-warning-700 dark:text-warning-400'">
                                                        {{ c.type === 'contribution' ? i18n.t('goals.activity.tagContribution') : i18n.t('goals.activity.tagDeallocation') }}
                                                    </span>
                                                </div>
                                                <div class="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-2 truncate">
                                                    <span>{{ formatActivityDate(c.date) }}</span>
                                                    @if (c.notes) {
                                                        <span class="truncate">· {{ c.notes }}</span>
                                                    }
                                                </div>
                                            </div>
                                            <div class="text-sm font-bold shrink-0"
                                                 [ngClass]="c.type === 'contribution' ? 'text-positive' : 'text-warning'">
                                                {{ c.type === 'contribution' ? '+' : '−' }}<app-amount [value]="c.amount" />
                                            </div>
                                            <button
                                                *ngIf="!share.active()"
                                                type="button"
                                                class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-negative-50 dark:hover:bg-negative-700/40 transition-colors shrink-0"
                                                [title]="i18n.t('common.delete')"
                                                (click)="confirmDeleteContribution(c)"
                                            >
                                                <i class="pi pi-trash text-xs text-surface-500 dark:text-surface-400"></i>
                                            </button>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>

                        <!-- Note -->
                        @if (userNote()) {
                            <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
                                <div class="relative flex items-center gap-2 mb-2">
                                    <i class="pi pi-comment text-ochre-500"></i>
                                    <h3 class="font-semibold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('goals.fields.note') }}</h3>
                                </div>
                                <p class="relative text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap m-0">{{ userNote() }}</p>
                            </div>
                        }
                    </div>

                    <!-- RIGHT — details panel -->
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 self-start">
                        <h3 class="relative font-semibold text-surface-900 dark:text-surface-0 mb-4 m-0">
                            {{ i18n.t('goals.detail.details') }}
                        </h3>
                        <dl class="relative flex flex-col divide-y divide-surface-200 dark:divide-surface-800">
                            <div class="flex items-center justify-between py-3">
                                <dt class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('goals.detail.status') }}</dt>
                                <dd class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ i18n.t('goals.status.' + statusKey()) }}</dd>
                            </div>
                            <div class="flex items-center justify-between py-3">
                                <dt class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('goals.fields.targetAmount') }}</dt>
                                <dd class="text-sm font-medium text-surface-900 dark:text-surface-0">
                                    @if (g.target_amount > 0) {
                                        <app-amount [value]="g.target_amount" />
                                    } @else { — }
                                </dd>
                            </div>
                            <div class="flex items-center justify-between py-3">
                                <dt class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('goals.fields.targetDate') }}</dt>
                                <dd class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ formattedDate() || '—' }}</dd>
                            </div>
                            <div class="flex items-center justify-between py-3">
                                <dt class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('goals.detail.template') }}</dt>
                                <dd class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ i18n.t(template().nameKey) }}</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            }
        </div>

        <!-- Edit dialog -->
        <app-goal-add-dialog
            [(visible)]="editDialogVisible"
            [existingGoal]="goal()"
            [saving]="saving()"
            (save)="onSave($event)"
        />

        <!-- Allocate dialog -->
        <app-goal-allocate-dialog
            [(visible)]="allocateDialogVisible"
            [goal]="goal()"
            [assets]="liquidAssets()"
            [busy]="allocating()"
            (submit)="onAllocate($event)"
        />

        <!-- Share progress dialog -->
        <p-dialog [(visible)]="shareDialog" [modal]="true" [dismissableMask]="true" [draggable]="false"
                  [style]="{ width: '95vw', maxWidth: '440px' }" [header]="i18n.t('goals.share.title')">
            <div class="flex flex-col gap-4 pt-1">
                <p class="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{{ i18n.t('goals.share.desc') }}</p>

                @if (shareBusy()) {
                    <div class="flex justify-center py-4"><i class="pi pi-spin pi-spinner text-surface-400"></i></div>
                } @else if (shareUrl()) {
                    <div class="flex items-center gap-2 p-2 pl-3 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                        <span class="flex-1 min-w-0 truncate text-sm text-surface-700 dark:text-surface-300">{{ shareUrl() }}</span>
                        <button class="shrink-0 px-3 py-2 rounded-lg bg-brand-700 text-white text-xs font-semibold" (click)="copyShareUrl()">
                            <i class="pi pi-copy text-xs mr-1"></i>{{ copied() ? i18n.t('goals.share.copied') : i18n.t('goals.share.copy') }}
                        </button>
                    </div>
                    <div class="flex items-start gap-2">
                        <i class="pi pi-eye text-surface-400 text-xs mt-0.5 shrink-0"></i>
                        <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">{{ i18n.t('goals.share.readonlyNote') }}</p>
                    </div>
                    <button class="text-xs text-negative font-medium hover:underline self-start" [disabled]="shareBusy()" (click)="revokeShare()">
                        {{ i18n.t('goals.share.revoke') }}
                    </button>
                }
            </div>
        </p-dialog>

        <p-toast position="top-center" />
        <p-confirmDialog />
    `,
})
export class GoalDetailPage implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private nav = inject(NavService);
    private api = inject(ApiService);
    private state = inject(AssetsStateService);
    private message = inject(MessageService);
    private confirm = inject(ConfirmationService);
    cs = inject(CurrencyService);
    i18n = inject(I18nService);
    share = inject(ShareContextService);

    private routeSub?: Subscription;
    private stateSub?: Subscription;

    loading = signal(true);
    loadingContributions = signal(false);
    saving = signal(false);
    allocating = signal(false);
    goal = signal<SavingGoal | null>(null);
    contributions = signal<GoalContribution[]>([]);
    liquidAssets = signal<LiquidAsset[]>([]);
    private heroFallback = signal<string | null>(null);

    editDialogVisible = false;
    allocateDialogVisible = false;

    template = computed(() => templateOf(templateKeyOf(this.goal())));

    heroImage = computed(() => {
        const g = this.goal();
        if (!g) return '';
        const fb = this.heroFallback();
        if (fb) return fb;
        return g.image_url || this.template().imageFull;
    });

    userNote = computed(() => this.goal()?.description ?? '');

    percent = computed(() => {
        const g = this.goal();
        return g ? progressPercent(g.current_amount, g.target_amount) : 0;
    });

    remaining = computed<number | null>(() => {
        const g = this.goal();
        if (!g || g.target_amount <= 0) return null;
        return Math.max(0, g.target_amount - g.current_amount);
    });

    monthsLeft = computed(() => {
        const g = this.goal();
        return g ? monthsRemaining(g.target_date) : null;
    });

    monthlyNeeded = computed(() => {
        const g = this.goal();
        return g ? monthlyContributionNeeded(g) : null;
    });

    statusKey = computed(() => {
        const g = this.goal();
        if (!g) return 'noTarget';
        switch (computeStatus(g)) {
            case 'completed': return 'completed';
            case 'on_track': return 'onTrack';
            case 'at_risk': return 'atRisk';
            case 'no_deadline': return 'noDeadline';
            case 'no_target': return 'noTarget';
        }
    });

    badgeClass = computed(() => {
        const g = this.goal();
        const status = g ? computeStatus(g) : 'no_target';
        switch (status) {
            case 'completed':
                return 'bg-positive text-white';
            case 'on_track':
                return 'bg-brand-700 dark:bg-brand-300 text-white dark:text-brand-900';
            case 'at_risk':
                return 'bg-warning text-white';
            default:
                return 'bg-warm-700 text-white';
        }
    });

    badgeIcon = computed(() => {
        const g = this.goal();
        const status = g ? computeStatus(g) : 'no_target';
        switch (status) {
            case 'completed': return 'pi pi-check-circle';
            case 'on_track': return 'pi pi-arrow-up-right';
            case 'at_risk': return 'pi pi-exclamation-triangle';
            default: return 'pi pi-flag';
        }
    });

    barClass = computed(() => {
        const g = this.goal();
        const status = g ? computeStatus(g) : 'no_target';
        switch (status) {
            case 'completed':
                return 'bg-positive-500';
            case 'on_track':
                return 'bg-ochre-500';
            case 'at_risk':
                return 'bg-warning-500';
            default:
                return 'bg-ochre-500';
        }
    });

    formattedDate = computed(() => {
        const g = this.goal();
        if (!g?.target_date) return '';
        const d = new Date(g.target_date);
        const lang = this.i18n.lang();
        return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
    });

    formatActivityDate(iso: string): string {
        const d = new Date(iso);
        const lang = this.i18n.lang();
        return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    ngOnInit() {
        this.routeSub = this.route.paramMap.subscribe(params => {
            const id = Number(params.get('id'));
            if (Number.isFinite(id) && id > 0) {
                this.loadAll(id);
            } else {
                this.loading.set(false);
                this.goal.set(null);
            }
        });
        this.stateSub = this.state.savingsUpdated$.subscribe(() => {
            const g = this.goal();
            if (g) this.loadAll(g.id, /* silent */ true);
        });
    }

    ngOnDestroy() {
        this.routeSub?.unsubscribe();
        this.stateSub?.unsubscribe();
    }

    private async loadAll(id: number, silent = false) {
        if (!silent) this.loading.set(true);
        this.loadingContributions.set(true);
        try {
            const [goal, contributions, assets] = await Promise.all([
                firstValueFrom(this.api.getSavingGoal(id)),
                firstValueFrom(this.api.listGoalContributions(id)),
                firstValueFrom(this.api.listLiquidAssets()),
            ]);
            this.goal.set(goal);
            this.contributions.set(contributions);
            this.liquidAssets.set(assets);
            this.heroFallback.set(null);
        } catch (err) {
            console.error('Error loading goal detail:', err);
            this.goal.set(null);
        } finally {
            this.loading.set(false);
            this.loadingContributions.set(false);
        }
    }

    onHeroError() {
        this.heroFallback.set(this.template().image);
    }

    back() {
        this.nav.go('pages', 'goals');
    }

    openEdit() {
        this.editDialogVisible = true;
    }

    // ── Read-only share ─────────────────────────────────────────────────────
    shareDialog = false;
    shareBusy = signal(false);
    shareUrl = signal<string>('');
    copied = signal(false);

    private buildShareUrl(token: string): string {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/g/${token}`;
    }

    openShare() {
        const g = this.goal();
        if (!g) return;
        this.copied.set(false);
        this.shareDialog = true;
        if (g.share_token) {
            this.shareUrl.set(this.buildShareUrl(g.share_token));
            return;
        }
        this.shareBusy.set(true);
        this.shareUrl.set('');
        this.api.shareGoal(g.id).subscribe({
            next: res => {
                this.shareBusy.set(false);
                this.shareUrl.set(this.buildShareUrl(res.share_token));
                const cur = this.goal();
                if (cur) this.goal.set({ ...cur, share_token: res.share_token });
            },
            error: () => { this.shareBusy.set(false); this.message.add({ severity: 'error', summary: 'Omaad', detail: this.i18n.t('goals.share.error'), life: 4000 }); },
        });
    }

    copyShareUrl() {
        const url = this.shareUrl();
        if (!url) return;
        navigator.clipboard?.writeText(url).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        }).catch(() => {});
    }

    revokeShare() {
        const g = this.goal();
        if (!g) return;
        this.shareBusy.set(true);
        this.api.unshareGoal(g.id).subscribe({
            next: () => {
                this.shareBusy.set(false);
                this.shareDialog = false;
                this.shareUrl.set('');
                const cur = this.goal();
                if (cur) this.goal.set({ ...cur, share_token: null });
                this.message.add({ severity: 'success', summary: 'Omaad', detail: this.i18n.t('goals.share.revoked'), life: 4000 });
            },
            error: () => { this.shareBusy.set(false); this.message.add({ severity: 'error', summary: 'Omaad', detail: this.i18n.t('goals.share.error'), life: 4000 }); },
        });
    }

    openAllocate() {
        if (this.liquidAssets().length === 0) {
            this.message.add({
                severity: 'warn',
                summary: this.i18n.t('common.error'),
                detail: this.i18n.t('goals.allocate.noLiquidAssetsToast'),
                life: 5000,
            });
            return;
        }
        this.allocateDialogVisible = true;
    }

    confirmDelete() {
        const g = this.goal();
        if (!g) return;
        this.confirm.confirm({
            message: this.i18n.t('goals.messages.deleteConfirm', { name: g.name }),
            header: this.i18n.t('common.confirm'),
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: this.i18n.t('common.delete'),
            rejectLabel: this.i18n.t('common.cancel'),
            acceptButtonStyleClass: '!bg-negative !border-negative',
            accept: async () => {
                try {
                    await firstValueFrom(this.api.deleteSavingGoal(g.id));
                    this.message.add({ severity: 'success', summary: this.i18n.t('common.success'), detail: this.i18n.t('goals.messages.deleted'), life: 3000 });
                    this.state.notifySavingsUpdated();
                    this.back();
                } catch (err) {
                    console.error('Error deleting goal:', err);
                    this.message.add({ severity: 'error', summary: this.i18n.t('common.error'), detail: this.i18n.t('goals.messages.deleteError'), life: 4000 });
                }
            },
        });
    }

    confirmDeleteContribution(c: GoalContribution) {
        const g = this.goal();
        if (!g) return;
        this.confirm.confirm({
            message: this.i18n.t('goals.activity.deleteConfirm'),
            header: this.i18n.t('common.confirm'),
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: this.i18n.t('common.delete'),
            rejectLabel: this.i18n.t('common.cancel'),
            acceptButtonStyleClass: '!bg-negative !border-negative',
            accept: async () => {
                try {
                    await firstValueFrom(this.api.deleteGoalContribution(g.id, c.id));
                    this.message.add({ severity: 'success', summary: this.i18n.t('common.success'), detail: this.i18n.t('goals.activity.deleted'), life: 3000 });
                    this.state.notifySavingsUpdated();
                    await this.loadAll(g.id, /* silent */ true);
                } catch (err) {
                    console.error('Error deleting contribution:', err);
                    this.message.add({ severity: 'error', summary: this.i18n.t('common.error'), detail: this.i18n.t('goals.activity.deleteError'), life: 4000 });
                }
            },
        });
    }

    async onAllocate(payload: AllocatePayload) {
        const g = this.goal();
        if (!g) return;
        this.allocating.set(true);
        try {
            if (payload.mode === 'contribute') {
                await firstValueFrom(this.api.contributeToGoal(g.id, payload.body));
                this.message.add({ severity: 'success', summary: this.i18n.t('common.success'), detail: this.i18n.t('goals.messages.contributed'), life: 3000 });
            } else {
                await firstValueFrom(this.api.deallocateFromGoal(g.id, payload.body));
                this.message.add({ severity: 'success', summary: this.i18n.t('common.success'), detail: this.i18n.t('goals.messages.deallocated'), life: 3000 });
            }
            this.allocateDialogVisible = false;
            this.state.notifySavingsUpdated();
            await this.loadAll(g.id, /* silent */ true);
        } catch (err: any) {
            console.error('Error allocating:', err);
            const detail = err?.error?.detail || this.i18n.t('goals.messages.contributeError');
            this.message.add({ severity: 'error', summary: this.i18n.t('common.error'), detail, life: 5000 });
        } finally {
            this.allocating.set(false);
        }
    }

    async onSave(payload: GoalSavePayload) {
        if (!payload.update) return;
        this.saving.set(true);
        try {
            await firstValueFrom(this.api.updateSavingGoal(payload.update.id, payload.update.patch));
            this.message.add({ severity: 'success', summary: this.i18n.t('common.success'), detail: this.i18n.t('goals.messages.updated'), life: 3000 });
            this.editDialogVisible = false;
            this.state.notifySavingsUpdated();
            await this.loadAll(payload.update.id, /* silent */ true);
        } catch (err) {
            console.error('Error saving goal:', err);
            this.message.add({ severity: 'error', summary: this.i18n.t('common.error'), detail: this.i18n.t('goals.messages.saveError'), life: 4000 });
        } finally {
            this.saving.set(false);
        }
    }
}
