// DEV environment — used by `ng serve` and the development build.
// Points at a LOCAL backend so testing destructive flows (delete account,
// seeding) never mutates real user rows on Render. The production build
// swaps this file for environment.prod.ts via angular.json fileReplacements.
export const environment = {
    production: false,
    version: '0.3.0',
    apiUrl: 'http://localhost:8000/api/v1',
    googleClientId: '338569032785-oosvdq7uk3jfhqtmqap4565dncceahud.apps.googleusercontent.com',
    // Build-time defaults for feature flags (S12). Runtime overrides live in
    // FeatureFlagsService (localStorage), so a flag can be flipped on a device
    // against a deployed preview without rebuilding.
    featureFlags: {
        aiChat: true,
        // Force the scripted mock chat driver even with aiChat on (device
        // override `?ff_aiMock=1`): owner demos without a backend, and the
        // assistant smoke spec, which scripts scenarios the real agent cannot
        // replay. Never on by default.
        aiMock: false
    }
};
