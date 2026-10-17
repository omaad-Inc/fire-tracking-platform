# Feature flags and Premium early access

Frontend-only mechanism. The backend gates by tier (`FEATURE_TIERS` in
`billing_service.py`); flags decide what the web app shows.

## Flags

- Declared in `src/environments/environment*.ts` under `featureFlags`
  (build-time defaults), read only through `FeatureFlagsService.isOn(flag)`.
- Device override: `localStorage` key `omaad_ff_<flag>` = `1` or `0`, or any
  entry URL with `?ff_<flag>=1|0` (case-insensitive, persisted on the device).
- Routes behind a flag use `canMatch`: `aiChatGuard` for `aiChat`,
  `featureFlagGuard('<flag>')` for every next feature.

Two flags exist today and neither is a feature in the product sense:
`aiChat` is the infra kill-switch for the AI surfaces (ENT-1 decision, stays
the AI reach limiter until infra scales) and `aiMock` forces the scripted chat
driver for demos and smokes.

## Early access (PREM-4, Premium promise "Accès anticipé aux nouveautés")

A flag listed in the `EARLY_ACCESS_FLAGS` registry
(`src/app/core/services/feature-flags.service.ts`) is ON for a real Premium
user before its general flip: `isOn()` short-circuits to `true` when
`BillingService.effectivePlan() === 'premium'`. The beta courtesy grants Pro,
never Premium, so it does not qualify. Nothing else changes: free and Pro users
follow the env default and their device override.

The registry is explicit on purpose. A blanket "every flag on for Premium"
would flip the `aiChat` kill-switch for every Premium user, which infra cannot
absorb. `aiChat` and `aiMock` are therefore never listed.

### Shipping a new feature with early access

1. Add the flag to `featureFlags` in both environment files, default `false`.
2. Add it to `EARLY_ACCESS_FLAGS` in `feature-flags.service.ts`.
3. Gate the route with `canMatch: [featureFlagGuard('<flag>')]` and the
   in-template entry points with `flags.isOn('<flag>')`. The guard awaits the
   first subscription read (`BillingService.ensureLoaded()`), so a Premium
   user matches the route on their very first navigation of a session.
4. Optional badge: `flags.isEarlyAccess('<flag>')` is true only while the
   feature is on because of Premium (false once the flag is generally on).
   Whether to show an "Accès anticipé" badge is an open owner call; the
   helper is there either way.
5. General launch: flip the env default to `true`. The registry entry can
   stay (it becomes inert) or be removed in the same change.

Specs: `feature-flags.service.spec.ts` covers Premium on, free and courtesy-Pro
unaffected, `aiChat` never granted, the badge helper and the guard wait.
`BillingService` is resolved lazily and only for registry flags, so with the
registry empty no spec needs HttpClient for reading a flag. Once a flag is
registered, the specs of components that read it must stub `BillingService`
(`{ effectivePlan: signal('free'), ensureLoaded: () => Promise.resolve(), load: () => {} }`)
or add `provideHttpClient()`.
