import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription, firstValueFrom, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { I18nService } from '../../i18n/i18n.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { ApiService, SavingGoal } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { SavingsService } from '../service/savings.service';
import { AssetsStateService } from '../service/assets-state.service';
import { GoalCardComponent } from './components/goal-card';
import { GoalAddDialogComponent, GoalSavePayload } from './components/goal-add-dialog';
import { FireHeroCardComponent } from './components/fire-hero-card';
import { SavingsProgress } from './components/goals-progress-chart';
import { progressPercent } from './goal-utils';
import { PageHeaderComponent } from '../../core/ui';
import { FireDashboardPage } from '../fire/fire-dashboard';

@Component({
    selector: 'app-goals-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ButtonModule,
        ToastModule,
        AppAmountComponent,
        GoalCardComponent,
        GoalAddDialogComponent,
        FireHeroCardComponent,
        SavingsProgress,
        PageHeaderComponent,
        FireDashboardPage,
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="flex flex-col gap-6">
            <!-- Header -->
            <app-page-header
                icon="pi-flag-fill"
                [title]="i18n.t('goals.title')"
                [subtitle]="i18n.t('goals.subtitle')">
                <p-button
                    actions
                    *ngIf="!share.active() && tab() === 'goals'"
                    icon="pi pi-plus"
                    [label]="i18n.t('goals.add')"
                    (onClick)="openAdd()"
                    styleClass="omaad-cta !rounded-xl"
                />
            </app-page-header>

            <!-- Objectifs hub tabs: goals summary (with the FIRE hero) vs the
                 detailed FIRE projection. Deep-linkable via ?tab=fire. -->
            <div>
                <div class="inline-flex rounded-xl bg-surface-100 dark:bg-surface-800 p-1" role="tablist">
                    <button role="tab" [attr.aria-selected]="tab() === 'goals'"
                            (click)="setTab('goals')" [class]="tabClass('goals')">
                        {{ i18n.t('menu.myGoals') }}
                    </button>
                    <button role="tab" [attr.aria-selected]="tab() === 'fire'"
                            (click)="setTab('fire')" [class]="tabClass('fire')" data-testid="tab-fire">
                        {{ i18n.t('menu.fire') }}
                    </button>
                </div>
            </div>

            @if (tab() === 'goals') {
            <!-- FIRE hero (lifetime goal, always visible) -->
            <app-fire-hero-card />

            <!-- KPIs -->
            @if (!loading() && goals().length > 0) {
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 flex items-center gap-4 h-full min-h-[88px]">
                        <div class="relative w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                            <i class="pi pi-wallet text-brand-700 dark:text-ochre-400 text-lg"></i>
                        </div>
                        <div class="relative flex-1 min-w-0">
                            <div class="text-xs text-surface-500 dark:text-surface-400 truncate">{{ i18n.t('goals.kpi.totalSaved') }}</div>
                            <div class="text-xl font-bold text-surface-900 dark:text-surface-0 truncate">
                                <app-amount [value]="totalSaved()" />
                            </div>
                        </div>
                    </div>
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 flex items-center gap-4 h-full min-h-[88px]">
                        <div class="relative w-11 h-11 rounded-xl bg-ochre-100 dark:bg-ochre-700/20 flex items-center justify-center shrink-0">
                            <i class="pi pi-flag text-ochre-600 dark:text-ochre-400 text-lg"></i>
                        </div>
                        <div class="relative flex-1 min-w-0">
                            <div class="text-xs text-surface-500 dark:text-surface-400 truncate">{{ i18n.t('goals.kpi.totalTarget') }}</div>
                            <div class="text-xl font-bold text-surface-900 dark:text-surface-0 truncate">
                                <app-amount [value]="totalTarget()" />
                            </div>
                        </div>
                    </div>
                    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 flex items-center gap-4 h-full min-h-[88px]">
                        <div class="relative w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                            <i class="pi pi-chart-line text-brand-700 dark:text-ochre-400 text-lg"></i>
                        </div>
                        <div class="relative flex-1 min-w-0">
                            <div class="text-xs text-surface-500 dark:text-surface-400 truncate">{{ i18n.t('goals.kpi.overallProgress') }}</div>
                            <div class="text-xl font-bold text-surface-900 dark:text-surface-0 truncate">
                                {{ overallPercent() }}%
                            </div>
                        </div>
                    </div>
                </div>
            }

            <!-- Progression chart -->
            @if (!loading() && goals().length > 0) {
                <app-savings-progress />
            }

            <!-- List / loading / empty -->
            @if (loading()) {
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (i of [1,2,3,4,5,6]; track i) {
                        <div class="animate-pulse bg-surface-100 dark:bg-surface-800 rounded-2xl h-64"></div>
                    }
                </div>
            } @else if (goals().length === 0) {
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 text-center py-12">
                    <div class="relative w-20 h-20 mx-auto rounded-full bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center mb-4">
                        <i class="pi pi-flag text-3xl text-brand-700 dark:text-ochre-400"></i>
                    </div>
                    <h2 class="relative text-xl font-semibold text-surface-900 dark:text-surface-0 mb-2">
                        {{ i18n.t('goals.empty.title') }}
                    </h2>
                    <p class="relative text-surface-500 dark:text-surface-400 text-sm max-w-md mx-auto mb-6">
                        {{ i18n.t('goals.empty.subtitle') }}
                    </p>
                    <p-button
                        *ngIf="!share.active()"
                        icon="pi pi-plus"
                        [label]="i18n.t('goals.empty.cta')"
                        (onClick)="openAdd()"
                        styleClass="omaad-cta !rounded-xl"
                    />
                </div>
            } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (goal of goals(); track goal.id) {
                        <app-goal-card [goal]="goal" />
                    }
                </div>
            }
            } @else {
                <!-- FIRE tab: the detailed projection, embedded (its own header hidden).
                     @defer lazy-loads the heavier FIRE view only when this tab opens. -->
                @defer (on immediate) {
                    <app-fire-dashboard [embedded]="true" />
                } @placeholder {
                    <div class="animate-pulse bg-surface-100 dark:bg-surface-800 rounded-2xl h-96"></div>
                }
            }
        </div>

        <!-- Add dialog -->
        <app-goal-add-dialog
            [(visible)]="addDialogVisible"
            [existingGoal]="null"
            [saving]="saving()"
            (save)="onSave($event)"
        />

        <p-toast position="top-center" />
    `,
})
export class GoalsDashboardPage implements OnInit, OnDestroy {
    private api = inject(ApiService);
    private savings = inject(SavingsService);
    private state = inject(AssetsStateService);
    private message = inject(MessageService);
    cs = inject(CurrencyService);
    i18n = inject(I18nService);
    share = inject(ShareContextService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    /** Objectifs hub tab, derived from the URL (?tab=) so it reacts to ANY navigation
     *  while the page is already mounted, e.g. the FIRE hero's "Voir le détail" which
     *  hits /pages/fire and redirects to /pages/goals?tab=fire. */
    tab = toSignal(
        this.route.queryParamMap.pipe(map((qp): 'goals' | 'fire' => qp.get('tab') === 'fire' ? 'fire' : 'goals')),
        { initialValue: (this.route.snapshot.queryParamMap.get('tab') === 'fire' ? 'fire' : 'goals') as 'goals' | 'fire' },
    );

    private sub?: Subscription;

    loading = signal(true);
    saving = signal(false);
    goals = signal<SavingGoal[]>([]);

    addDialogVisible = false;

    totalSaved = computed(() => this.goals().reduce((s, g) => s + (g.current_amount ?? 0), 0));
    totalTarget = computed(() => this.goals().reduce((s, g) => s + (g.target_amount ?? 0), 0));
    overallPercent = computed(() => progressPercent(this.totalSaved(), this.totalTarget()));

    ngOnInit() {
        this.loadGoals();
        this.sub = this.state.savingsUpdated$.subscribe(() => this.loadGoals());
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    setTab(t: 'goals' | 'fire') {
        // Navigate only; `tab` is derived from the URL and updates from the query param.
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: t === 'goals' ? null : t },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    tabClass(t: 'goals' | 'fire'): string {
        const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer';
        return this.tab() === t
            ? `${base} bg-surface-0 dark:bg-surface-950 text-brand-700 dark:text-ochre-400 shadow-card`
            : `${base} text-surface-500 dark:text-surface-400`;
    }

    private async loadGoals() {
        this.loading.set(true);
        try {
            const goals = await firstValueFrom(this.api.getSavingGoals(0, 200));
            this.goals.set(goals);
        } catch (err) {
            console.error('Error loading goals:', err);
            this.message.add({ severity: 'error', summary: this.i18n.t('common.error'), detail: this.i18n.t('goals.messages.loadError'), life: 4000 });
        } finally {
            this.loading.set(false);
        }
    }

    openAdd() {
        this.addDialogVisible = true;
    }

    async onSave(payload: GoalSavePayload) {
        if (!payload.create) return; // dashboard only handles creates; edits live on the detail page
        this.saving.set(true);
        try {
            await this.savings.createGoal(payload.create);
            this.message.add({ severity: 'success', summary: this.i18n.t('common.success'), detail: this.i18n.t('goals.messages.created'), life: 3000 });
            this.addDialogVisible = false;
            await this.loadGoals();
            this.state.notifySavingsUpdated();
        } catch (err) {
            console.error('Error saving goal:', err);
            this.message.add({ severity: 'error', summary: this.i18n.t('common.error'), detail: this.i18n.t('goals.messages.saveError'), life: 4000 });
        } finally {
            this.saving.set(false);
        }
    }
}
