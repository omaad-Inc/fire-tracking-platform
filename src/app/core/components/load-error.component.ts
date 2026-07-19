import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';

/**
 * Shared error + retry card, shown when a data load fails.
 *
 * Never render a fake-empty/zero state on failure: on a finance app, "you
 * have no debts 🎉" after a network blip reads as data loss and destroys
 * trust. Extracted from the dashboard StatsWidget (the reference
 * implementation from the red-team review).
 */
@Component({
    standalone: true,
    selector: 'app-load-error',
    template: `
        <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 p-6 flex flex-col items-center text-center gap-3">
            <div class="flex items-center justify-center w-12 h-12 rounded-2xl bg-negative-50 dark:bg-negative-500/15">
                <i class="pi pi-exclamation-triangle text-negative-600 dark:text-negative-400 text-xl"></i>
            </div>
            <div class="font-semibold text-surface-900 dark:text-surface-0">{{ title() || i18n.t('common.loadErrorTitle') }}</div>
            <div class="text-sm text-surface-500 dark:text-surface-400 max-w-sm">{{ body() || i18n.t('common.loadErrorBody') }}</div>
            <button type="button" (click)="retry.emit()"
                    class="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors">
                <i class="pi pi-refresh text-xs"></i>{{ i18n.t('common.retry') }}
            </button>
        </div>
    `
})
export class LoadErrorComponent {
    readonly i18n = inject(I18nService);
    /** Optional overrides; default to the generic common.loadError* copy. */
    title = input<string>('');
    body = input<string>('');
    retry = output<void>();
}
