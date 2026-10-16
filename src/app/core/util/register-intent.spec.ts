import { isRegisterIntent, registerIntentUrl, stashRegisterIntent, takeRegisterIntent, takeRegisterIntentUrl } from './register-intent';

describe('register intent (landing F8)', () => {
    beforeEach(() => sessionStorage.clear());

    it('accepts only the four landing intents', () => {
        expect(isRegisterIntent('brvm')).toBeTrue();
        expect(isRegisterIntent('assistant')).toBeTrue();
        expect(isRegisterIntent('BRVM')).toBeFalse();
        expect(isRegisterIntent('')).toBeFalse();
        expect(isRegisterIntent(undefined)).toBeFalse();
        expect(isRegisterIntent('javascript:alert(1)')).toBeFalse();
    });

    it('stashes a valid intent for the tab and consumes it once', () => {
        stashRegisterIntent('budget');
        expect(takeRegisterIntent()).toBe('budget');
        expect(takeRegisterIntent()).toBeNull();
    });

    it('ignores an unknown value and keeps the stashed one', () => {
        stashRegisterIntent('goal');
        stashRegisterIntent('elsewhere');
        stashRegisterIntent(undefined);
        expect(takeRegisterIntent()).toBe('goal');
    });

    it('maps each intent to the screen the CTA promised, in the right language', () => {
        expect(registerIntentUrl('fr', 'brvm')).toBe('/fr/pages/patrimoine/add-asset?category=stocks_brvm');
        expect(registerIntentUrl('en', 'budget')).toBe('/en/pages/transaction');
        expect(registerIntentUrl('fr', 'goal')).toBe('/fr/pages/goals');
        expect(registerIntentUrl('en', 'assistant')).toBe('/en/pages/assistant');
    });

    it('falls back when nothing is stashed, and for assistant without the AI chat flag', () => {
        expect(takeRegisterIntentUrl('fr', '/fr')).toBe('/fr');
        stashRegisterIntent('assistant');
        expect(takeRegisterIntentUrl('fr', '/fr', { aiChat: false })).toBe('/fr');
        expect(takeRegisterIntent()).toBeNull();
        stashRegisterIntent('assistant');
        expect(takeRegisterIntentUrl('en', '/en')).toBe('/en/pages/assistant');
    });
});
