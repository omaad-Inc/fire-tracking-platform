import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Zero-message state that teaches by example (plan step 7, first-glance
 * directive): the assistant greets first, then four tappable starter prompts.
 *
 * The panel is shared by both agents (config records, the advisor advises), so
 * the state adapts to the user (S12 Phase 5): a brand-new, empty portfolio gets
 * the recording-led screen (get data in first, the advisor has nothing to
 * ground on yet); a populated portfolio gets the advice-led variant, since the
 * advisor is what pays off once there is data. A recording example stays the
 * top chip in BOTH variants, so config remains a first-class suggestion.
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
                {{ title() }}
            </h1>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6 max-w-xs">
                {{ subtitle() }}
            </p>
            @if (!hideSuggestions()) {
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
            }
        </div>
    `,
})
export class ChatEmptyStateComponent {
    private i18n = inject(I18nService);

    /** True once the user already has a portfolio -> advice-led variant. */
    populated = input(false);

    /** True while the composer holds a draft: hide the starter chips so a tall
     *  mobile draft never covers them (they return when the input is emptied). */
    hideSuggestions = input(false);

    @Output() pick = new EventEmitter<string>();

    private base = computed(() =>
        this.populated() ? 'assistant.emptyReturning' : 'assistant.empty',
    );

    title = computed(() => {
        this.i18n.lang();
        return this.i18n.t(`${this.base()}.title`);
    });

    subtitle = computed(() => {
        this.i18n.lang();
        return this.i18n.t(`${this.base()}.subtitle`);
    });

    prompts = computed(() => {
        this.i18n.lang(); // recompute on language switch
        const b = this.base();
        return [1, 2, 3, 4].map((n) => this.i18n.t(`${b}.starter${n}`));
    });
}
