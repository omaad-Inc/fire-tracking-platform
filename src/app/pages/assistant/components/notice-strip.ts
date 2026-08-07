import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { NoticeVM } from '../../../core/ai/chat-events';
import { BillingService } from '../../../core/services/billing.service';
import { NavService } from '../../../core/services/nav.service';

/**
 * Quiet, distinct band for `notice` events (plan step 4): CIMA disclaimer,
 * quota warnings, turn timeouts. Deliberately NOT a bubble; it must read as
 * system voice, not as the assistant speaking.
 *
 * PREM-4: a `quota_reached` notice is the conversion moment, so it upgrades
 * from a quiet strip to an ochre upsell card WITH an Upgrade CTA whenever
 * upgrading would actually help. The target is derived from the exhausted
 * bucket + the user's effective tier: the advisor bucket upsells to Premium;
 * the free setup grant upsells to Pro; a Pro/Premium period cap just informs
 * (it renews next cycle), so no CTA. The exhausted-quota message text itself
 * is server-provided and already localized to that exact case.
 */
@Component({
    selector: 'app-notice-strip',
    standalone: true,
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (upgradeTarget(); as tier) {
            <div class="rounded-xl border px-3.5 py-3 max-w-md
                        border-ochre-300 dark:border-ochre-700 bg-ochre-50 dark:bg-ochre-900/20">
                <div class="flex items-start gap-2.5">
                    <i class="pi pi-gauge text-sm mt-0.5 shrink-0 text-ochre-600 dark:text-ochre-300"
                       aria-hidden="true"></i>
                    <div class="min-w-0 flex-1">
                        <p class="text-[13px] leading-snug text-surface-700 dark:text-surface-200">{{ text() }}</p>
                        <div class="flex items-center gap-2 mt-2.5">
                            <a [routerLink]="plansLink()" [queryParams]="{ tier: tier }"
                               class="omaad-press inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full
                                      bg-ochre-500 hover:bg-ochre-400 text-warm-900 transition-colors">
                                <i class="pi pi-crown" style="font-size: 10px" aria-hidden="true"></i>
                                {{ t('assistant.errorState.upgrade') }}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        } @else {
            <div class="flex items-start gap-2 pl-3 pr-2 py-2 rounded-lg border-l-2 max-w-md"
                 [ngClass]="toneClass()">
                <i class="pi text-xs mt-0.5 shrink-0" [ngClass]="icon()" aria-hidden="true"></i>
                <p class="text-xs leading-snug">{{ text() }}</p>
            </div>
        }
    `,
})
export class NoticeStripComponent {
    private i18n = inject(I18nService);
    private billing = inject(BillingService);
    private nav = inject(NavService);
    t = (k: string) => this.i18n.t(k);

    @Input({ required: true }) notice!: NoticeVM;

    /** The effective tier the SERVER gated on: beta courtesy lifts everyone to
     *  at least Pro (mirrors billing_service.has_plan), so the CTA matches the
     *  server's "reached" copy instead of the raw (still-'free') plan. */
    private tier = computed<'free' | 'pro' | 'premium'>(() => {
        const plan = this.billing.effectivePlan() as 'free' | 'pro' | 'premium';
        if (plan === 'premium') return 'premium';
        return this.billing.betaCourtesy() ? 'pro' : plan;
    });

    /** The upsell target for a quota_reached notice, or null when upgrading
     *  would not help (a Pro/Premium period cap that renews, or an already-top
     *  tier). Advisor bucket -> Premium; the free setup grant -> Pro. */
    upgradeTarget(): 'pro' | 'premium' | null {
        if (this.notice.kind !== 'quota_reached') return null;
        if (this.notice.bucket === 'advisor') {
            return this.tier() === 'premium' ? null : 'premium';
        }
        // config bucket: only a genuinely free user gains from upgrading (to Pro).
        return this.tier() === 'free' ? 'pro' : null;
    }

    /** Server-provided message wins (already localized); i18n key as fallback. */
    text(): string {
        if (this.notice.message) return this.notice.message;
        switch (this.notice.kind) {
            case 'disclaimer_cima': return this.i18n.t('assistant.notice.disclaimerCima');
            case 'quota_warning': return this.i18n.t('assistant.notice.quotaWarning');
            case 'quota_reached': return this.i18n.t('assistant.notice.quotaReached');
            case 'turn_timeout': return this.i18n.t('assistant.notice.turnTimeout');
        }
    }

    icon(): string {
        if (this.notice.kind === 'turn_timeout') return 'pi-clock';
        return this.notice.kind === 'disclaimer_cima' ? 'pi-info-circle' : 'pi-gauge';
    }

    toneClass(): string {
        // A turn timeout is a normal end, not a quota event: quiet system
        // voice, no warning tint (and no upsell CTA — UX-1 code mapping).
        if (this.notice.kind === 'disclaimer_cima' || this.notice.kind === 'turn_timeout') {
            return 'border-surface-300 dark:border-surface-600 text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-800/60'; // dark-ok
        }
        return 'border-warning-400 dark:border-warning-500 text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-900/20';
    }

    plansLink(): unknown[] {
        return this.nav.link('pages', 'plans');
    }
}
