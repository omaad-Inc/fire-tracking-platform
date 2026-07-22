# Omaad Design System — UI primitives

Presentational building blocks that make the app read as one deliberate system.
Introduced in Sprint 2 (Design System Elevation).

## Rules

1. **Presentational only.** These components take inputs and project content.
   They never inject services, call the API, or hold app state. That keeps them
   reusable, trivially testable, and safe to render anywhere.
2. **Standalone + OnPush.** Every primitive is `standalone: true` with
   `ChangeDetectionStrategy.OnPush`. Consumers are free to be OnPush too.
3. **Tokens, not magic numbers.** Use the semantic scale and palette from
   `tailwind.config.js`: type (`text-title`/`text-heading`/`text-subheading`/
   `text-eyebrow`), radius (`rounded-xl`/`rounded-2xl`), shadow (`shadow-card`/
   `shadow-lifted`), motion (`ease-standard`/`ease-emphasized`), and the
   `brand`/`ochre`/`positive`/`warning`/`negative`/`surface` colors. Never
   hardcode hex values in a component.
4. **WCAG.** Ochre backgrounds use dark text (see the note in the config).

## Container / presentational convention

- **Presentational (dumb):** these primitives + widget views. Inputs in, events
  out, no data fetching. File lives next to its feature or here in `core/ui`.
- **Container (smart):** a page/route component that injects services, owns
  signals/state, and composes presentational children. Templates for large
  containers live in an external `*.html` via `templateUrl` (Sprint 2 splits the
  1400-line god components this way).

## Components

| Selector | Purpose |
|---|---|
| `app-page-header` | Top-of-page eyebrow + title + subtitle + actions slot |
| `app-section-header` | In-page section title + subtitle + actions slot |
| `app-ui-card` | Standard card shell (radius, border, shadow, padding) |
| `app-stat-card` | KPI tile (label + projected value + icon + trend) |
| `app-empty-state` | Designed empty block (icon + title + message + CTA slot) |
| `app-chip` | Tokenized status/category pill |

Import from the barrel: `import { PageHeaderComponent } from '@app/core/ui';`
(or the relative path).
