import { AI_ASSISTANT_CACHE_KEY, CHAT_THREAD_KEY_PREFIX, NOTIF_PREFS_CACHE_KEY, TokenService } from './token.service';

/**
 * Logout is the single storage choke point: clear() must wipe every per-user
 * cache so nothing survives to the next account on a shared browser. Regression
 * guard for chat threads (which carry financial detail) leaking across users.
 */
describe('TokenService (logout storage purge)', () => {
    afterEach(() => localStorage.clear());

    it('clear() wipes all chat threads, the assistant panel cache and profile caches', () => {
        localStorage.setItem(`${CHAT_THREAD_KEY_PREFIX}:1`, '[]');
        localStorage.setItem(`${CHAT_THREAD_KEY_PREFIX}:2`, '[]');
        localStorage.setItem(CHAT_THREAD_KEY_PREFIX, '[]'); // legacy un-scoped
        localStorage.setItem(AI_ASSISTANT_CACHE_KEY, '{}');
        localStorage.setItem(NOTIF_PREFS_CACHE_KEY, '{}');
        localStorage.setItem('omaad_user', '{"id":1}');

        new TokenService().clear();

        expect(localStorage.getItem(`${CHAT_THREAD_KEY_PREFIX}:1`)).toBeNull();
        expect(localStorage.getItem(`${CHAT_THREAD_KEY_PREFIX}:2`)).toBeNull();
        expect(localStorage.getItem(CHAT_THREAD_KEY_PREFIX)).toBeNull();
        expect(localStorage.getItem(AI_ASSISTANT_CACHE_KEY)).toBeNull();
        expect(localStorage.getItem(NOTIF_PREFS_CACHE_KEY)).toBeNull();
        expect(localStorage.getItem('omaad_user')).toBeNull();
    });

    it('clear() leaves unrelated keys untouched', () => {
        localStorage.setItem('omaad-layout-config', '{"darkTheme":true}');
        localStorage.setItem('omaad_lang', 'fr');

        new TokenService().clear();

        expect(localStorage.getItem('omaad-layout-config')).not.toBeNull();
        expect(localStorage.getItem('omaad_lang')).toBe('fr');
    });
});
