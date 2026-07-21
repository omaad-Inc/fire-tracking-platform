// @ts-check
// ESLint 9 FLAT config (P4-TEST-1). The previous eslint.config.js was in the
// legacy eslintrc shape (`export default { extends: ['eslint:recommended', ...] }`),
// which ESLint 9 cannot parse — so `ng lint`/eslint never actually ran. This is
// the real flat config; `npm run lint` now lints the Angular sources.
//
// Selector-prefix rules stay OFF: the landing marketing components use
// intentional widget selectors (hero-widget, topbar-widget, social-proof-widget)
// next to the app-prefixed ones. A couple of rules are `warn` where this
// (never-linted) codebase has a known backlog (`any` at chart/API boundaries,
// tracked in P2-FE-7) so lint is a usable signal, not a wall of errors. Not
// chained into the build yet (baseline isn't clean).
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
    {
        ignores: ['dist/**', '.angular/**', 'coverage/**', 'node_modules/**'],
    },
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/component-selector': 'off',
            '@angular-eslint/directive-selector': 'off',
            '@angular-eslint/component-class-suffix': 'off',
            '@angular-eslint/no-output-on-prefix': 'off',
            '@angular-eslint/no-output-native': 'warn',
            '@angular-eslint/use-lifecycle-interface': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-unused-expressions': 'warn',
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
    {
        files: ['**/*.html'],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
        ],
        rules: {
            '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
            // Pre-existing a11y backlog on this never-linted codebase — surfaced
            // as warnings so lint is CI-chainable now; tighten to error in a
            // focused a11y pass (extends P1-13..16 / P2-A11Y-*).
            '@angular-eslint/template/label-has-associated-control': 'warn',
            '@angular-eslint/template/elements-content': 'warn',
            '@angular-eslint/template/interactive-supports-focus': 'warn',
            '@angular-eslint/template/click-events-have-key-events': 'warn',
        },
    },
);
