import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';

/**
 * Degraded-state bubble (plan step 8): stream error with retry, quota-reached
 * with the upsell into the plans page, offline, AI-unavailable (breaker open).
 * Code decides the treatment; the message (if server-provided) is shown as-is.
 */
@Component({
    selector: 'app-chat-error-block',
    standalone: true,
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="rounded-xl border px-3.5 py-3 max-w-md"
             [ngClass]="quota()
                ? 'border-ochre-300 dark:border-ochre-700 bg-ochre-50 dark:bg-ochre-900/20'
                : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60'">
            <div class="flex items-start gap-2.5">
                <i class="pi text-sm mt-0.5 shrink-0"
                   [ngClass]="quota()
                        ? 'pi-gauge text-ochre-600 dark:text-ochre-300'
                        : 'pi-exclamation-circle text-surface-500 dark:text-surface-400'"
                   aria-hidden="true"></i>
                <div class="min-w-0 flex-1">
                    <p class="text-[13px] leading-snug text-surface-700 dark:text-surface-200">{{ text() }}</p>
                    <!-- The consent gate owns its own CTA (it has replaced the
                         composer by the time this renders), so this bubble
                         carries no action: a Retry here would just refail. -->
                    @if (!consentMissing()) {
                    <div class="flex items-center gap-2 mt-2.5">
                        @if (quota()) {
                            <a [routerLink]="plansLink()"
                               class="omaad-press inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full
                                      bg-ochre-500 hover:bg-ochre-400 text-warm-900 transition-colors">
                                <i class="pi pi-crown" style="font-size: 10px" aria-hidden="true"></i>
                                {{ t('assistant.errorState.upgrade') }}
                            </a>
                        } @else if (waitOnly()) {
                            <span class="inline-flex items-center gap-1.5 text-xs font-medium
                                         text-surface-500 dark:text-surface-400">
                                <i class="pi pi-clock" style="font-size: 10px" aria-hidden="true"></i>
                                {{ t('assistant.errorState.waitShortly') }}
                            </span>
                        } @else {
                            <button type="button"
                                    class="omaad-press inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                                           border border-surface-300 dark:border-surface-600
                                           text-surface-700 dark:text-surface-200
                                           hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                                    (click)="retry.emit()">
                                <i class="pi pi-refresh" style="font-size: 10px" aria-hidden="true"></i>
                                {{ t('assistant.errorState.retry') }}
                            </button>
                        }
                    </div>
                    }
                </div>
            </div>
        </div>
    `,
})
export class ChatErrorBlockComponent {
    private i18n = inject(I18nService);
    private nav = inject(NavService);
    t = (k: string) => this.i18n.t(k);

    @Input({ required: true }) code!: string;
    @Input() message = '';
    @Output() retry = new EventEmitter<void>();

    /** Upgrade path: the quota ceiling AND the 403 entitlement gate both route
     *  to the plans page; a Retry here would just fail again (UX-1). */
    quota(): boolean {
        return this.code === 'QUOTA_REACHED' || this.code === 'PLAN_REQUIRED';
    }

    /** 429: retrying immediately refails, so show a "try again shortly" state
     *  with no Retry button instead of a failing-retry loop (UX-1). */
    waitOnly(): boolean {
        return this.code === 'rate_limited';
    }

    /** The consent gate refused the turn (P0-1). Actionless bubble: the gate
     *  has already replaced the composer with its own CTA. */
    consentMissing(): boolean {
        return this.code === 'AI_CONSENT_REQUIRED';
    }

    text(): string {
        if (this.message) return this.message;
        switch (this.code) {
            case 'OFFLINE': return this.t('assistant.errorState.offline');
            case 'QUOTA_REACHED': return this.t('assistant.errorState.quotaReached');
            case 'PLAN_REQUIRED': return this.t('assistant.errorState.quotaReached');
            case 'rate_limited': return this.t('assistant.errorState.rateLimited');
            case 'AI_CONSENT_REQUIRED': return this.t('assistant.consent.blockedTurn');
            case 'UPSTREAM_UNAVAILABLE': return this.t('assistant.errorState.unavailable');
            default: return this.t('assistant.errorState.generic');
        }
    }

    plansLink(): unknown[] {
        return this.nav.link('pages', 'plans');
    }
}
