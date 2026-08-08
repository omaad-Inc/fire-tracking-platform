// PROD environment — swapped in for environment.ts by the production build
// (angular.json fileReplacements). Netlify runs `ng build` (production), so
// omaad.africa always talks to the Render backend.
export const environment = {
    production: true,
    version: '0.3.0',
    apiUrl: 'https://api.omaad.africa/api/v1',
    googleClientId: '338569032785-oosvdq7uk3jfhqtmqap4565dncceahud.apps.googleusercontent.com',
    // S12 AI chat is LIVE in prod: on by default, no ?ff_aiChat= needed. The
    // flag stays wired as the kill switch — set false here (or per device via
    // the FeatureFlagsService override) to pull the chat without a rollback.
    featureFlags: {
        aiChat: true
    }
};
