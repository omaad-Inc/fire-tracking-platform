import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';
import { NoticeVM } from '../../../core/ai/chat-events';

/**
 * Quiet, distinct band for `notice` events (plan step 4): CIMA disclaimer,
 * quota warnings. Deliberately NOT a bubble; it must read as system voice,
 * not as the assistant speaking.
 */
@Component({
    selector: 'app-notice-strip',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex items-start gap-2 pl-3 pr-2 py-2 rounded-lg border-l-2 max-w-md"
             [ngClass]="toneClass()">
            <i class="pi text-xs mt-0.5 shrink-0" [ngClass]="icon()" aria-hidden="true"></i>
            <p class="text-xs leading-snug">{{ text() }}</p>
        </div>
    `,
})
export class NoticeStripComponent {
    private i18n = inject(I18nService);

    @Input({ required: true }) notice!: NoticeVM;

    /** Server-provided message wins (already localized); i18n key as fallback. */
    text(): string {
        if (this.notice.message) return this.notice.message;
        switch (this.notice.kind) {
            case 'disclaimer_cima': return this.i18n.t('assistant.notice.disclaimerCima');
            case 'quota_warning': return this.i18n.t('assistant.notice.quotaWarning');
            case 'quota_reached': return this.i18n.t('assistant.notice.quotaReached');
        }
    }

    icon(): string {
        return this.notice.kind === 'disclaimer_cima' ? 'pi-info-circle' : 'pi-gauge';
    }

    toneClass(): string {
        if (this.notice.kind === 'disclaimer_cima') {
            return 'border-surface-300 dark:border-surface-600 text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-800/60'; // dark-ok
        }
        return 'border-warning-400 dark:border-warning-500 text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-900/20';
    }
}
