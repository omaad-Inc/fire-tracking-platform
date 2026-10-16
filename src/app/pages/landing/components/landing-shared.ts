import { Router } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import type { Lang } from '../../../i18n/i18n.service';

/** The `/fr` or `/en` router prefix of the current URL ("/" has none: FR). */
export function landingLangPrefix(router: Router): string {
    const match = router.url.match(/^\/(fr|en)(?:\/|$)/);
    return '/' + (match ? match[1] : 'fr');
}

export function landingLang(router: Router): Lang {
    return landingLangPrefix(router).slice(1) as Lang;
}

/**
 * One `cta_click` shape for every landing CTA: `placement` names where the
 * visitor clicked (hero_register, pricing_pro, sheet_login...), `cta` keeps
 * the pre-redesign property name so the analytics warehouse keeps working.
 */
export function trackLandingCta(analytics: AnalyticsService, router: Router, placement: string): void {
    analytics.trackPublic('cta_click', { cta: placement, placement, lang: landingLang(router) });
}
