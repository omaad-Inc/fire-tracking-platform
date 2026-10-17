import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';

/**
 * Loads the APP tier of the active dictionary before an in-app route renders
 * (F13). Public pages boot with the public tier only (a quarter of the copy);
 * every route that is not a public page carries this guard so its first
 * render never shows raw key paths. Idempotent and instant once loaded.
 */
export const i18nAppTierGuard: CanActivateFn = () => {
    const i18n = inject(I18nService);
    return i18n.loadLang(i18n.lang(), 'app').then(() => true);
};
