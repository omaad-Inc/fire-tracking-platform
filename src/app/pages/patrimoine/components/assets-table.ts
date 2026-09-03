import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { I18nService } from '../../../i18n/i18n.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';
import { PrivacyService } from '../../../core/services/privacy.service';
import { NavService } from '../../../core/services/nav.service';
import { PatrimoineAssetItemDto } from '../../service/patrimoine.service';

/**
 * One table row, precomputed by the parent (same contract as TxTableRow): the
 * page owns category labels and icons, so every column is a plain sortable
 * field rather than a function call inside a sort comparator.
 */
export interface AssetTableRow {
    dto: PatrimoineAssetItemDto;
    id: number;
    name: string;
    category: string;
    catLabel: string;
    icon: string;
    institution: string;
    /** ISO code the asset is stored in. */
    currency: string;
    /** As stored, in `currency`. Not sortable across currencies, so the two
     *  value columns both sort on `value`. */
    nativeValue: number;
    /** EUR base, what <app-amount> converts. */
    value: number;
    deltaAbs: number;
    deltaPct: number;
}

/**
 * The desktop assets table (P3-4), the second `p-table` in the app after the
 * transactions table (P1-2), and built on the same rules: sortable columns, a
 * sticky header inside a scroll container, the whole loaded set (no paginator,
 * no new backend params), export over the rows on screen.
 *
 * What is specific here is money in TWO currencies per row: the value as
 * stored (a BRVM title in XOF, a Livret in EUR) and the value in the user's
 * display currency. The native figure is a string built here, so it masks
 * itself under privacy mode the way `CurrencyService.format()` does; the
 * display figure goes through <app-amount>, which already does.
 */
@Component({
    selector: 'app-assets-table',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink, TableModule, AppAmountComponent],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
            <p-table [value]="rows"
                     dataKey="id"
                     [scrollable]="true"
                     scrollHeight="60vh"
                     sortField="value"
                     [sortOrder]="-1"
                     styleClass="omaad-assets-table"
                     data-testid="assets-table">
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="name">
                            {{ t('common.name') }} <p-sortIcon field="name" />
                        </th>
                        <th pSortableColumn="catLabel" style="width:13rem">
                            {{ t('patrimoine.table.category') }} <p-sortIcon field="catLabel" />
                        </th>
                        <th pSortableColumn="institution" style="width:12rem">
                            {{ t('patrimoine.table.institution') }} <p-sortIcon field="institution" />
                        </th>
                        <th style="width:11rem" class="!text-right">
                            {{ t('patrimoine.table.native') }}
                        </th>
                        <th pSortableColumn="value" style="width:11rem" class="!text-right">
                            {{ t('patrimoine.table.value', { cur: displayCode() }) }} <p-sortIcon field="value" />
                        </th>
                        <th pSortableColumn="deltaPct" style="width:11rem" class="!text-right">
                            {{ t('patrimoine.table.change') }} <p-sortIcon field="deltaPct" />
                        </th>
                        <th style="width:3rem"></th>
                    </tr>
                </ng-template>

                <ng-template #body let-row>
                    <tr data-testid="asset-row" [attr.data-id]="row.id" class="cursor-pointer" (click)="open.emit(row)">
                        <td class="min-w-0">
                            <span class="flex items-center gap-3 min-w-0">
                                <span class="w-8 h-8 rounded-xl shrink-0 grid place-items-center bg-brand-700 text-white">
                                    <i [class]="row.icon + ' text-xs'" aria-hidden="true"></i>
                                </span>
                                <!-- A real link, so the keyboard and "open in new tab" work; the
                                     row click is the mouse shortcut. -->
                                <a [routerLink]="nav.link('pages', 'patrimoine', 'assets', row.id)"
                                   (click)="$event.stopPropagation()"
                                   class="block truncate font-medium text-surface-900 dark:text-surface-0 no-underline hover:underline">
                                    {{ row.name }}
                                </a>
                            </span>
                        </td>
                        <td>
                            <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full max-w-full
                                         bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200">
                                <span class="truncate">{{ row.catLabel }}</span>
                            </span>
                        </td>
                        <td class="text-surface-500 dark:text-surface-400 text-xs">
                            <span class="block truncate">{{ row.institution }}</span>
                        </td>
                        <td class="!text-right whitespace-nowrap tabular-nums text-surface-500 dark:text-surface-400 text-xs"
                            data-testid="asset-native">
                            {{ nativeLabel(row) }}
                        </td>
                        <td class="!text-right font-bold whitespace-nowrap text-surface-900 dark:text-surface-0">
                            <app-amount [value]="row.value" [animate]="false" />
                        </td>
                        <td class="!text-right whitespace-nowrap text-xs font-medium"
                            [ngClass]="row.deltaAbs === 0 ? 'text-surface-400 dark:text-surface-500' : (row.deltaAbs > 0 ? 'text-positive' : 'text-negative')">
                            @if (row.deltaAbs !== 0) {
                                <app-amount [value]="row.deltaAbs" [prefix]="row.deltaAbs > 0 ? '+' : '-'" [animate]="false" />
                                <span class="ml-1 tabular-nums">{{ row.deltaPct > 0 ? '+' : '' }}{{ row.deltaPct | number:'1.1-1' }}%</span>
                            } @else {
                                <span aria-hidden="true">·</span>
                            }
                        </td>
                        <td class="!text-right">
                            <i class="pi pi-chevron-right text-surface-400 text-xs" aria-hidden="true"></i>
                        </td>
                    </tr>
                </ng-template>

                <ng-template #emptymessage>
                    <tr>
                        <td colspan="7" class="!text-center text-surface-400 dark:text-surface-500 text-sm !py-10">
                            {{ t('patrimoine.table.noMatch') }}
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `,
    styles: [`
        /* Same header/row rhythm as the transactions table (P1-2). */
        :host ::ng-deep .omaad-assets-table .p-datatable-thead > tr > th {
            background: var(--surface-50);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--text-color-secondary);
            border-bottom: 1px solid var(--surface-200);
            padding: 0.625rem 0.75rem;
        }
        :host ::ng-deep .omaad-assets-table .p-datatable-tbody > tr > td {
            padding: 0.625rem 0.75rem;
            font-size: 13px;
            border-bottom: 1px solid var(--surface-100);
        }
        :host ::ng-deep .omaad-assets-table .p-datatable-tbody > tr:hover > td {
            background: var(--surface-50);
        }
    `],
})
export class AssetsTable {
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private privacy = inject(PrivacyService);
    protected nav = inject(NavService);

    @Input({ required: true }) rows: AssetTableRow[] = [];
    @Output() open = new EventEmitter<AssetTableRow>();

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }

    displayCode(): string {
        return this.cs.currencyCode();
    }

    /**
     * The stored figure in its own currency, ONLY when that differs from the
     * display currency (owner call): an XOF asset on an XOF display would repeat
     * the value column. Built as a string, so it MUST mask itself
     * (privacy-mask.smoke sweeps this page): every money string that does not
     * come from CurrencyService.format()/formatNumber() has to. Decimals follow
     * the currency: the CFA francs have no subunit in use.
     */
    nativeLabel(row: AssetTableRow): string {
        if (row.currency === this.displayCode()) return '';
        const symbol = this.cs.symbolFor(row.currency);
        if (this.privacy.hidden()) return `••••• ${symbol}`;
        const decimals = row.currency === 'XOF' || row.currency === 'XAF' ? 0 : 2;
        return `${this.cs.formatDisplayNumber(row.nativeValue, decimals)} ${symbol}`;
    }
}
