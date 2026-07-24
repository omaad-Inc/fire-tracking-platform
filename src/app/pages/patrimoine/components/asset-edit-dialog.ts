import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';

import { Asset } from '../../../core/services/api.service';
import { I18nService } from '../../../i18n/i18n.service';
import {
    AssetFormShape, getAssetFormShape, MOBILE_MONEY_OPERATORS, TontineStatus,
} from '../asset-form-shape';
import { isTouchDevice } from '../../../core/util/touch';

/** The mutable edit-form model, shared by reference between this dialog and the
 *  asset-detail container (which owns loading + persistence). */
export interface AssetEditForm {
    name: string;
    currentValue: number;
    purchaseValue: number | null;
    purchaseDate: Date | null;
    institution: string;
    surfaceM2: number | null;
    rentalIncome: number | null;
    quantity: number | null;
    tontineMonthlyContribution: number | null;
    tontineParticipants: number | null;
    tontineStartDate: Date | null;
    tontineCollectionDate: Date | null;
    tontineStatus: TontineStatus;
    tontineFrequency: 'monthly' | 'weekly';
    mobileMoneyOperator: string;
}

/**
 * Asset edit dialog (Sprint 2 split from the 1453-line asset-detail god
 * component). Presentational: it renders the per-category form over the
 * parent's `form` object (bound by reference) and emits `(save)`; the container
 * performs the API write. Standalone, OnPush, external template.
 */
@Component({
    standalone: true,
    selector: 'app-asset-edit-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule,
        InputNumberModule, DatePickerModule, SelectModule,
    ],
    templateUrl: './asset-edit-dialog.html',
})
export class AssetEditDialogComponent {
    /** Mobile-safe datepickers: touchUI modal + readonly input (no keyboard). */
    readonly isTouch = isTouchDevice();

    readonly i18n = inject(I18nService);
    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    /** The asset being edited — drives the form shape. */
    @Input() asset: Asset | null = null;
    /** Mutable form model, owned by the container and bound by reference. */
    @Input({ required: true }) form!: AssetEditForm;
    /** Native-currency symbol (FCFA / $ / €). */
    @Input() assetSymbol = '€';
    @Input() categoryIcon = 'pi pi-box';
    @Input() categoryLabel = '';
    /** True while the container is persisting the change. */
    @Input() saving = false;

    /** Two-way open state (banana-in-box with the container's boolean). */
    visible = model<boolean>(false);
    /** Fired when the user confirms; the container reads `form` and persists. */
    @Output() save = new EventEmitter<void>();

    /** The form shape for the current asset's category. */
    formShape(): AssetFormShape {
        return this.asset?.category ? getAssetFormShape(this.asset.category) : 'TOTAL_VALUE';
    }

    get tontineStatusOptions() {
        return [
            { value: 'en_cours',   label: this.t('assetDetail.tontineStatusInProgress') },
            { value: 'mise_recue', label: this.t('assetDetail.tontineStatusReceived') },
            { value: 'termine',    label: this.t('assetDetail.tontineStatusCompleted') },
        ];
    }

    get tontineFrequencyOptions() {
        return [
            { value: 'monthly', label: this.t('assetDetail.freqMonthly') },
            { value: 'weekly',  label: this.t('assetDetail.freqWeekly') },
        ];
    }

    readonly mobileMoneyOperatorOptions = MOBILE_MONEY_OPERATORS.map(o => ({ value: o, label: o }));
}
