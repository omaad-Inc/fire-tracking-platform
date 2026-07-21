/**
 * Maps each AssetCategory to a "form shape", the set of fields that
 * make sense to edit/create for that category. The same shape is used
 * by the add-asset wizard and the edit modal so they stay in sync.
 */
import { AssetCategory } from '../../core/services/api.service';

export type AssetFormShape =
    | 'TONTINE'           // Tontine, collective savings, monthly contribution + cycle
    | 'MOBILE_MONEY'      // Mobile Money, operator + current balance
    | 'SIMPLE_BALANCE'    // Cash, savings account, just a balance, no purchase event
    | 'QUANTITY_BASED'    // Stocks, bonds, crypto, commodities, quantity × unit price
    | 'REAL_ESTATE'       // Real estate, surface, fees, rental, etc.
    | 'TOTAL_VALUE';      // Retirement, life insurance, business, vehicle, collectibles, other

export function getAssetFormShape(category: AssetCategory): AssetFormShape {
    switch (category) {
        case 'tontine':         return 'TONTINE';
        case 'mobile_money':    return 'MOBILE_MONEY';
        case 'cash':
        case 'savings_account': return 'SIMPLE_BALANCE';
        case 'stocks_brvm':
        case 'stocks_intl':
        case 'bonds':
        case 'crypto':
        case 'commodities':     return 'QUANTITY_BASED';
        case 'real_estate':     return 'REAL_ESTATE';
        case 'retirement':
        case 'life_insurance':
        case 'business':
        case 'vehicle':
        case 'collectibles':
        case 'other':
        default:                return 'TOTAL_VALUE';
    }
}

/** Tontine status values, keep in sync with the dropdown options in the add wizard. */
export type TontineStatus = 'en_cours' | 'mise_recue' | 'termine';

/** Mobile money operators, keep in sync with `mobileMoneyProviders` in add-asset-page. */
export const MOBILE_MONEY_OPERATORS = [
    'Wave',
    'Orange Money',
    'MTN MoMo',
    'Moov Money',
    'Free Money',
    'Autre',
] as const;
