/**
 * Register intent (landing backlog F8, 2026-10-17).
 *
 * A feature CTA on the public landing ("Ajouter mes actions BRVM", "Suivre
 * mes dépenses", "Fixer mon objectif", "Essayer l'assistant") links to
 * register with `?intent=brvm|budget|goal|assistant`. The register page
 * stashes it for the tab (sessionStorage, like the OAuth returnUrl: the
 * Google round trip, the code screen and the welcome steps all keep it),
 * and the first in-app screen after onboarding honours it, so the user
 * lands on what the CTA promised instead of the Synthese. An unknown value
 * is ignored, an explicit returnUrl (PSP return) always wins, and the
 * intent is consumed on first use so it never fires twice.
 */
export const REGISTER_INTENTS = ['brvm', 'budget', 'goal', 'assistant'] as const;
export type RegisterIntent = (typeof REGISTER_INTENTS)[number];

const KEY = 'omaad_register_intent';

export function isRegisterIntent(value: unknown): value is RegisterIntent {
    return typeof value === 'string' && (REGISTER_INTENTS as readonly string[]).includes(value);
}

/** Keep a valid intent for this tab; anything else is a no-op (a plain visit never clears a stashed one, take() does). */
export function stashRegisterIntent(value: unknown): void {
    if (!isRegisterIntent(value)) return;
    try { sessionStorage.setItem(KEY, value); } catch { /* storage unavailable */ }
}

/** Read and clear the stashed intent; null when none. */
export function takeRegisterIntent(): RegisterIntent | null {
    try {
        const value = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        return isRegisterIntent(value) ? value : null;
    } catch {
        return null;
    }
}

/** The in-app screen each intent promised. `lang` is "fr" or "en" without a slash. */
export function registerIntentUrl(lang: string, intent: RegisterIntent): string {
    switch (intent) {
        case 'brvm': return `/${lang}/pages/patrimoine/add-asset?category=stocks_brvm`;
        case 'budget': return `/${lang}/pages/transaction`;
        case 'goal': return `/${lang}/pages/goals`;
        case 'assistant': return `/${lang}/pages/assistant`;
    }
}

/**
 * Where a user lands once sign-up (and onboarding, when it runs) is over:
 * the stashed intent's screen, else `fallback`. `assistant` needs the AI
 * chat route, which `canMatch`es only behind the aiChat flag: pass
 * `aiChat: false` to fall back instead of hitting a route that does not exist.
 */
export function takeRegisterIntentUrl(lang: string, fallback: string, opts: { aiChat?: boolean } = {}): string {
    const intent = takeRegisterIntent();
    if (!intent) return fallback;
    if (intent === 'assistant' && opts.aiChat === false) return fallback;
    return registerIntentUrl(lang, intent);
}
