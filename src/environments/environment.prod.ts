// PROD environment — swapped in for environment.ts by the production build
// (angular.json fileReplacements). Netlify runs `ng build` (production), so
// omaad.africa always talks to the Render backend.
export const environment = {
    production: true,
    version: '0.3.0',
    apiUrl: 'https://fire-tracking-backend.onrender.com/api/v1',
    googleClientId: '338569032785-oosvdq7uk3jfhqtmqap4565dncceahud.apps.googleusercontent.com'
};
