import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SavingGoal } from '../../../core/services/api.service';
import { templateOf } from '../goal-templates';
import { computeStatus, progressPercent, templateKeyOf } from '../goal-utils';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-goal-card',
    standalone: true,
    imports: [CommonModule, AppAmountComponent],
    template: `
        <button
            type="button"
            (click)="navigate()"
            class="group text-left w-full bg-surface-0 dark:bg-surface-900 rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm transition-colors"
        >
            <!-- Image banner -->
            <div class="relative h-32 sm:h-36 bg-surface-100 dark:bg-surface-900 overflow-hidden">
                <img
                    *ngIf="image"
                    [src]="image"
                    [alt]="goal.name"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    (error)="image = ''"
                />
                <div *ngIf="!image" class="w-full h-full bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center">
                    <i [class]="template().icon + ' text-3xl text-brand-700 dark:text-ochre-400'"></i>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <!-- Status badge -->
                <span
                    class="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md shadow-md"
                    [ngClass]="badgeClass"
                >
                    <i [class]="badgeIcon + ' text-[10px]'"></i>
                    {{ badgeLabel }}
                </span>
            </div>

            <!-- Content -->
            <div class="p-4 flex flex-col gap-3">
                <div class="flex items-start justify-between gap-2">
                    <h3 class="font-semibold text-surface-900 dark:text-surface-0 text-base leading-tight line-clamp-2 flex-1">
                        {{ goal.name }}
                    </h3>
                    <i [class]="template().icon + ' text-surface-400 text-base mt-0.5'"></i>
                </div>

                <!-- Progress bar -->
                @if (goal.target_amount > 0) {
                    <div>
                        <div class="flex items-center justify-between text-xs mb-1.5">
                            <span class="text-surface-500 dark:text-surface-400">{{ i18n.t('goals.progress') }}</span>
                            <span class="font-bold text-surface-900 dark:text-surface-0">{{ percent }}%</span>
                        </div>
                        <div class="relative h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                            <div
                                class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                                [ngClass]="barClass"
                                [style.width.%]="percent"
                            ></div>
                        </div>
                    </div>
                }

                <!-- Amounts -->
                <div class="flex items-end justify-between">
                    <div>
                        <div class="font-bold text-surface-900 dark:text-surface-0 text-sm">
                            <app-amount [value]="goal.current_amount" />
                        </div>
                        @if (goal.target_amount > 0) {
                            <div class="text-xs text-surface-400 dark:text-surface-500">
                                {{ i18n.t('goals.outOf') }} <app-amount [value]="goal.target_amount" />
                            </div>
                        }
                    </div>
                    @if (goal.target_date) {
                        <div class="text-[11px] text-surface-500 dark:text-surface-400 flex items-center gap-1">
                            <i class="pi pi-calendar text-[10px]"></i>
                            {{ formattedDate }}
                        </div>
                    }
                </div>
            </div>
        </button>
    `,
})
export class GoalCardComponent {
    @Input({ required: true }) goal!: SavingGoal;
    i18n = inject(I18nService);
    private router = inject(Router);

    image = '';

    ngOnChanges() {
        this.image = this.goal?.image_url || templateOf(templateKeyOf(this.goal)).image;
    }

    navigate() {
        this.router.navigate(['/', this.i18n.lang(), 'pages', 'goals', this.goal.id]);
    }

    template = computed(() => templateOf(templateKeyOf(this.goal)));

    get percent(): number {
        return progressPercent(this.goal.current_amount, this.goal.target_amount);
    }

    get status() {
        return computeStatus(this.goal);
    }

    get badgeLabel(): string {
        return this.i18n.t('goals.status.' + this.statusKey);
    }

    private get statusKey(): string {
        switch (this.status) {
            case 'completed': return 'completed';
            case 'on_track': return 'onTrack';
            case 'at_risk': return 'atRisk';
            case 'no_deadline': return 'noDeadline';
            case 'no_target': return 'noTarget';
        }
    }

    get badgeClass(): string {
        switch (this.status) {
            // "Completed" = achieved → semantic green (the celebratory moment).
            // "On track" = still navigating → brand navy (active progress, not yet a win).
            // Reserves green for the rare "you made it" moment, keeping the page calmer.
            case 'completed': return 'bg-positive text-white';
            case 'on_track': return 'bg-brand-700 dark:bg-brand-300 text-white dark:text-brand-900';
            case 'at_risk': return 'bg-warning text-white';
            case 'no_deadline': return 'bg-warm-700 text-white';
            case 'no_target': return 'bg-warm-700 text-white';
        }
    }

    get badgeIcon(): string {
        switch (this.status) {
            case 'completed': return 'pi pi-check-circle';
            case 'on_track': return 'pi pi-arrow-up-right';
            case 'at_risk': return 'pi pi-exclamation-triangle';
            case 'no_deadline': return 'pi pi-flag';
            case 'no_target': return 'pi pi-flag';
        }
    }

    get barClass(): string {
        switch (this.status) {
            case 'completed':
                return 'bg-positive-500';
            case 'on_track':
                return 'bg-ochre-500';
            case 'at_risk':
                return 'bg-warning-500';
            default:
                return 'bg-ochre-500';
        }
    }

    get formattedDate(): string {
        if (!this.goal.target_date) return '';
        const d = new Date(this.goal.target_date);
        const lang = this.i18n.lang();
        return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' });
    }
}
