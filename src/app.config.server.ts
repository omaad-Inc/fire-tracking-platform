import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

/**
 * Config serveur utilisée UNIQUEMENT par le prérendu au build (`prerender`
 * dans angular.json) : le site reste servi en statique sur Netlify, il n'y a
 * pas de serveur Node en production. Seules les routes listées dans
 * `prerender-routes.txt` (pages SEO /outils/**) sont rendues au build.
 */
const serverConfig: ApplicationConfig = {
    providers: [provideServerRendering()]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
