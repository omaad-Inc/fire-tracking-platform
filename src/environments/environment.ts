// DEV environment — used by `ng serve` and the development build.
// Points at a LOCAL backend so testing destructive flows (delete account,
// seeding) never mutates real user rows on Render. The production build
// swaps this file for environment.prod.ts via angular.json fileReplacements.
export const environment = {
    production: false,
    version: '0.3.0',
    apiUrl: 'http://localhost:8000/api/v1',
    googleClientId: '338569032785-oosvdq7uk3jfhqtmqap4565dncceahud.apps.googleusercontent.com'
};
