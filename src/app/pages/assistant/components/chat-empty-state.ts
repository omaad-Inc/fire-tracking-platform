import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Zero-message state that teaches by example (plan step 7, first-glance
 * directive): the assistant greets first, then four tappable starter prompts
 * cover the four things it can do (record an asset, a transaction, a goal, or
 * answer a question) so a brand-new user sees the full surface in one screen.
 */
@Component({
    selector: 'app-chat-empty-state',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="h-full flex flex-col items-center justify-center px-6 text-center omaad-enter">
            <span class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4
                         bg-ochre-100 dark:bg-ochre-900/30">
                <i class="pi pi-sparkles text-2xl text-ochre-600 dark:text-ochre-300" aria-hidden="true"></i>
            </span>
            <h1 class="text-lg font-bold text-surface-900 dark:text-surface-0 mb-1">
                {{ t('assistant.empty.title') }}
            </h1>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6 max-w-xs">
                {{ t('assistant.empty.subtitle') }}
            </p>
            <div class="flex flex-col gap-2 w-full max-w-sm">
                @for (prompt of prompts(); track $index) {
                    <button type="button"
                            class="omaad-press omaad-enter text-left text-sm px-4 py-3 rounded-xl border
                                   border-surface-200 dark:border-surface-700
                                   bg-surface-0 dark:bg-surface-900
                                   text-surface-700 dark:text-surface-200
                                   hover:border-ochre-300 dark:hover:border-ochre-600
                                   hover:bg-ochre-50 dark:hover:bg-ochre-900/20 transition-colors"
                            [class.omaad-d1]="$index === 0"
                            [class.omaad-d2]="$index === 1"
                            [class.omaad-d3]="$index === 2"
                            [class.omaad-d4]="$index === 3"
                            (click)="pick.emit(prompt)">
                        <i class="pi pi-arrow-up-right text-xs mr-2 text-ochre-600 dark:text-ochre-300" aria-hidden="true"></i>
                        {{ prompt }}
                    </button>
                }
            </div>
        </div>
    `,
})
export class ChatEmptyStateComponent {
    private i18n = inject(I18nService);
    t = (k: string) => this.i18n.t(k);

    @Output() pick = new EventEmitter<string>();

    prompts = computed(() => {
        this.i18n.lang(); // recompute on language switch
        return [
            this.i18n.t('assistant.empty.starter1'),
            this.i18n.t('assistant.empty.starter2'),
            this.i18n.t('assistant.empty.starter3'),
            this.i18n.t('assistant.empty.starter4'),
        ];
    });
}
