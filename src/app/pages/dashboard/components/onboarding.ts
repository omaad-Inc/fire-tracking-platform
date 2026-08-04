import { ChangeDetectionStrategy, Component, inject, input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TokenService } from '../../../core/services/token.service';
import { I18nService } from '../../../i18n/i18n.service';
import { FeatureFlagsService } from '../../../core/services/feature-flags.service';

/**
 * Post-onboarding "prochaines etapes" nudge (S12 Phase 6). Replaces the old
 * dashboard onboarding checklist: the guided first-run now lives in the
 * full-screen concierge (/:lang/onboarding). This slim card is only the reopen
 * entry for a user who skipped it. Same selector + input/output API as before,
 * so the dashboard host is unchanged; the gating (showOnboarding / anyDone)
 * still decides when it appears.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-onboarding',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule],
    template: `
        @if (flags.aiChat()) {
        <div class="relative flex items-center gap-4 p-4 sm:p-5 mb-8 rounded-2xl border border-brand-200 dark:border-brand-700 bg-brand-50/60 dark:bg-brand-900/20">
            <div class="shrink-0 w-11 h-11 rounded-xl bg-brand-700 dark:bg-brand-600 flex items-center justify-center">
                <i class="pi pi-sparkles text-lg text-white" aria-hidden="true"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-surface-900 dark:text-surface-0 text-sm sm:text-base">
                    {{ t('onboarding.nudge.title') }}
                </h3>
                <p class="text-surface-500 dark:text-surface-400 text-xs sm:text-sm leading-relaxed">
                    {{ t('onboarding.nudge.desc') }}
                </p>
            </div>
            <button pButton pRipple type="button" [label]="t('onboarding.nudge.cta')"
                    class="shrink-0 !rounded-full !py-2 !px-4 !text-sm !font-semibold omaad-cta !border-0"
                    (click)="start()"></button>
            <button type="button" (click)="dismiss()" aria-label="Dismiss"
                    class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 cursor-pointer">
                <i class="pi pi-times text-[11px]" aria-hidden="true"></i>
            </button>
        </div>
        }
    `
})
export class OnboardingComponent {
    private router = inject(Router);
    private tokenService = inject(TokenService);
    private i18n = inject(I18nService);
    protected flags = inject(FeatureFlagsService);

    // Kept for host API compatibility (the dashboard binds these); the nudge no
    // longer renders per-step state, so they are unused.
    hasAssets = input<boolean>(false);
    hasTransactions = input<boolean>(false);
    hasFireGoal = input<boolean>(false);

    @Output() addAsset = new EventEmitter<void>();
    @Output() dismissed = new EventEmitter<void>();

    t(key: string): string { return this.i18n.t(key); }

    private get lang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return match ? match[1] : 'fr';
    }

    /** Reopen the full-screen concierge (behind ff_aiChat; the guard bounces if off). */
    start(): void {
        this.router.navigate(['/', this.lang, 'onboarding']);
    }

    dismiss(): void {
        localStorage.setItem('omaad_onboarding_dismissed', 'true');
        this.dismissed.emit();
    }
}
