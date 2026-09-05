import type { AssetCategory } from '../services/api.service';

/**
 * The asset categories that can back a transaction — the account it was
 * debited from or credited to.
 *
 * This is a CONTRACT with the server, not a preference: the backend's
 * `ACCOUNT_CATEGORIES` (backend/app/models/asset.py) is this exact set, and
 * `_validate_account_ids` rejects anything else with a 422 on every
 * transaction and every recurring rule. Offering a wider list in a picker does
 * not enable anything, it just moves the failure to the save button.
 *
 * Note `tontine` is deliberately OUT, even though goal allocation counts it as
 * liquid (`LIQUID_CATEGORIES` in backend/app/services/goal_service.py). The two
 * rules answer different questions — "can I contribute this to a goal" is not
 * "can I spend from this" — so do NOT reach for `/savings/liquid-assets` to
 * fill an account picker: it also returns anything merely flagged `is_liquid`,
 * which is how stocks, FCP and real estate ended up in the recurring form.
 *
 * The Flutter app holds the same list in `_monetaryCategories`
 * (lib/core/data/repositories.dart) — keep the two in step.
 */
export const MONETARY_CATEGORIES: readonly AssetCategory[] = [
    'cash',
    'savings_account',
    'mobile_money',
] as const;

/** Whether an asset category can back a transaction. */
export function isMonetaryCategory(category: string | null | undefined): boolean {
    return MONETARY_CATEGORIES.includes(category as AssetCategory);
}
