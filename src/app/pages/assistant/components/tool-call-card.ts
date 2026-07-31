import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';
import { ToolCardVM } from '../../../core/ai/chat-events';

/**
 * The signature component of the chat surface (plan step 5): one card per
 * tool_use, updated in place by tool_result (keyed by card_id).
 *
 * States: running / done (+ Annuler when undoable) / confirm (dry-run diff +
 * Confirmer/Annuler, visually blocking) / error / undoing / undone / cancelled.
 */
@Component({
    selector: 'app-tool-call-card',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="rounded-xl border overflow-hidden max-w-md transition-colors"
             [ngClass]="frameClass()">

            <!-- Header row: tool identity -->
            <div class="flex items-center gap-2.5 px-3.5 py-2.5">
                <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      [ngClass]="iconWrapClass()">
                    @if (card.state === 'running' || card.state === 'undoing') {
                        <i class="pi pi-spin pi-spinner text-sm" aria-hidden="true"></i>
                    } @else {
                        <i class="pi text-sm" [ngClass]="icon()" aria-hidden="true"></i>
                    }
                </span>
                <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-semibold leading-tight truncate"
                       [class.line-through]="card.state === 'undone'"
                       [ngClass]="card.state === 'undone' || card.state === 'cancelled'
                            ? 'text-surface-400 dark:text-surface-500'
                            : 'text-surface-900 dark:text-surface-50'">
                        {{ title() }}
                    </p>
                    <p class="text-xs leading-tight truncate mt-0.5 text-surface-500 dark:text-surface-400"
                       [class.line-through]="card.state === 'undone'">
                        {{ subtitle() }}
                    </p>
                </div>
                <!-- State affordance on the right -->
                @if (card.state === 'done' && card.undoToken) {
                    <button type="button"
                            class="omaad-press shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg
                                   text-surface-600 dark:text-surface-300
                                   hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            (click)="undo.emit(card.cardId)">
                        {{ t('assistant.card.undo') }}
                    </button>
                }
                @if (card.state === 'undone') {
                    <span class="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full
                                 bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400">
                        {{ t('assistant.card.undone') }}
                    </span>
                }
                @if (card.state === 'cancelled') {
                    <span class="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full
                                 bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400">
                        {{ t('assistant.card.cancelled') }}
                    </span>
                }
            </div>

            <!-- Running shimmer -->
            @if (card.state === 'running') {
                <div class="px-3.5 pb-3">
                    <div class="shimmer h-2.5 rounded-full w-3/4 dark:bg-surface-800"></div>
                </div>
            }

            <!-- Confirm: dry-run diff + decision pair. Blocks the composer. -->
            @if (card.state === 'confirm') {
                <div class="border-t border-surface-200 dark:border-surface-700">
                    <p class="px-3.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wide
                              text-surface-500 dark:text-surface-400">
                        {{ t('assistant.card.confirmTitle') }}
                    </p>
                    <ul class="px-3.5 py-2 space-y-1.5">
                        @for (line of card.diff; track $index) {
                            <li class="flex items-start gap-2">
                                <i class="pi text-xs mt-0.5" [ngClass]="opIcon(line.op)" aria-hidden="true"></i>
                                <div class="min-w-0">
                                    <p class="text-[13px] leading-snug text-surface-800 dark:text-surface-100">{{ line.label }}</p>
                                    @if (line.detail) {
                                        <p class="text-[11px] text-surface-500 dark:text-surface-400">{{ line.detail }}</p>
                                    }
                                </div>
                            </li>
                        }
                    </ul>
                    <div class="flex gap-2 px-3.5 pb-3">
                        <button type="button"
                                class="omaad-press flex-1 text-[13px] font-semibold py-2 rounded-lg
                                       bg-brand-700 hover:bg-brand-800 text-white
                                       dark:bg-ochre-400 dark:hover:bg-ochre-300 dark:text-warm-900 transition-colors"
                                (click)="confirm.emit({ cardId: card.cardId, approved: true })">
                            {{ t('assistant.card.confirm') }}
                        </button>
                        <button type="button"
                                class="omaad-press flex-1 text-[13px] font-semibold py-2 rounded-lg
                                       border border-surface-300 dark:border-surface-600
                                       text-surface-700 dark:text-surface-200
                                       hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                                (click)="confirm.emit({ cardId: card.cardId, approved: false })">
                            {{ t('assistant.card.cancel') }}
                        </button>
                    </div>
                </div>
            }
        </div>
    `,
})
export class ToolCallCardComponent {
    private i18n = inject(I18nService);
    t = (k: string) => this.i18n.t(k);

    @Input({ required: true }) card!: ToolCardVM;
    @Output() confirm = new EventEmitter<{ cardId: string; approved: boolean }>();
    @Output() undo = new EventEmitter<string>();

    /** Card headline: result summary once done, tool label while running. */
    title(): string {
        if (this.card.summary && this.card.state !== 'running' && this.card.state !== 'confirm') {
            return this.card.summary;
        }
        return this.toolLabel();
    }

    subtitle(): string {
        if (this.card.state === 'running') return this.t('assistant.card.running');
        if (this.card.state === 'undoing') return this.t('assistant.card.undoing');
        if (this.card.state === 'confirm') return this.card.argsPreview;
        if (this.card.state === 'error') return this.card.summary || this.t('assistant.card.error');
        return this.toolLabel();
    }

    private toolLabel(): string {
        const key = `assistant.tools.${this.card.tool}`;
        const label = this.t(key);
        return label === key ? this.card.tool : label;
    }

    icon(): string {
        if (this.card.state === 'error') return 'pi-exclamation-triangle';
        if (this.card.state === 'done') return 'pi-check';
        if (this.card.state === 'undone' || this.card.state === 'cancelled') return 'pi-undo';
        const byTool: Record<string, string> = {
            create_asset: 'pi-wallet',
            create_txn: 'pi-arrow-right-arrow-left',
            create_goal: 'pi-bullseye',
            create_debt: 'pi-credit-card',
            bulk_import: 'pi-file-import',
            search_existing: 'pi-search',
        };
        return byTool[this.card.tool] ?? 'pi-bolt';
    }

    iconWrapClass(): string {
        switch (this.card.state) {
            case 'done':
                return 'bg-positive-50 text-positive-700 dark:bg-positive-900/30 dark:text-positive-300';
            case 'error':
                return 'bg-negative-50 text-negative-700 dark:bg-negative-900/30 dark:text-negative-300';
            case 'undone':
            case 'cancelled':
                return 'bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500';
            default:
                return 'bg-ochre-50 text-ochre-700 dark:bg-ochre-900/30 dark:text-ochre-300'; // dark-ok
        }
    }

    frameClass(): string {
        if (this.card.state === 'confirm') {
            return 'bg-surface-0 dark:bg-surface-900 border-ochre-300 dark:border-ochre-700 shadow-card';
        }
        if (this.card.state === 'error') {
            return 'bg-surface-0 dark:bg-surface-900 border-negative-200 dark:border-negative-800';
        }
        return 'bg-surface-0 dark:bg-surface-900 border-surface-200 dark:border-surface-700';
    }

    opIcon(op: 'create' | 'update' | 'delete'): string {
        switch (op) {
            case 'create': return 'pi-plus-circle text-positive-600 dark:text-positive-400';
            case 'update': return 'pi-pencil text-warning-600 dark:text-warning-400';
            case 'delete': return 'pi-trash text-negative-600 dark:text-negative-400';
        }
    }
}
