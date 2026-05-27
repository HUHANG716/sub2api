# Burnt Mandarin Theme Token Refresh Design

## Goal

Refresh the frontend theme so Hahacode keeps an orange brand identity while feeling calmer and more mature. The first implementation should be token-first: update global Tailwind and CSS theme tokens, and avoid broad page-level restyling.

## Selected Direction

Use the Burnt Mandarin direction:

- Primary orange moves away from the default bright Tailwind orange toward a deeper mature orange.
- Light theme backgrounds become softer and less bright, with a subtle neutral gray-green cast.
- Surfaces still read as clean product UI, but avoid pure-white glare where global tokens control the layer.
- Dark theme keeps the existing neutral dark foundation and only synchronizes the orange accent tokens.

## Scope

In scope:

- `frontend/tailwind.config.js`
  - Replace the default `primary` orange scale with a Burnt Mandarin scale.
  - Update orange glow shadow values so they match the new primary color.
  - Keep existing accent and dark neutral palettes unless a direct primary-token dependency requires adjustment.
- `frontend/src/style.css`
  - Update light theme `--theme-bg`, `--theme-bg-soft`, `--theme-surface`, `--theme-surface-strong`, `--theme-surface-muted`, borders, primary/accent colors, soft accents, scrollbar track, and button shadows.
  - Update dark theme only for `--theme-primary`, `--theme-primary-hover`, `--theme-primary-soft`, `--theme-accent`, and matching orange shadows where present.
- Existing theme/token tests
  - Update assertions that currently pin old orange values.

Out of scope for this pass:

- Page-by-page conversion of hardcoded `orange-*`, `amber-*`, `bg-white`, or `bg-gray-*` classes.
- Landing page layout changes, typography changes, spacing changes, or copy changes.
- Payment or docs component redesigns beyond natural token inheritance.
- Backend changes.

## Proposed Tokens

Primary scale target:

- `primary-50`: `#fff8f1`
- `primary-100`: `#fde9d7`
- `primary-200`: `#f8cfad`
- `primary-300`: `#efaa75`
- `primary-400`: `#df7f3d`
- `primary-500`: `#c65a1e`
- `primary-600`: `#a94718`
- `primary-700`: `#873719`
- `primary-800`: `#6f301a`
- `primary-900`: `#5d2a19`
- `primary-950`: `#331309`

Light theme global tokens:

- Main background: `#f3f5f2`
- Soft background: `#e8eee8`
- Strong surface: `#fffdf9`
- Default translucent surface: `rgba(255, 253, 249, 0.92)`
- Muted surface: `rgba(243, 245, 242, 0.9)`
- Primary/accent: `#c65a1e`
- Hover: `#a94718`
- Soft accent: `rgba(198, 90, 30, 0.12)`

Dark theme orange tokens:

- Primary/accent: `#d97732`
- Hover: `#ef9a5c`
- Soft accent: `rgba(217, 119, 50, 0.14)`

## User Experience

The light theme should no longer feel like a bright white dashboard. It should still feel clean and readable, with enough contrast for dense admin screens. Orange should read as intentional brand color rather than default Tailwind orange.

The dark theme should preserve the current neutral dark tone. The change should be visible only in orange accents, buttons, focus states, and token-based highlights.

## Acceptance Criteria

- Primary buttons and token-based orange accents use Burnt Mandarin instead of `#f97316`.
- Light app shell backgrounds are visibly softer than the current `#f7f9fb / #eef4f6`.
- Existing token-based payment/status/common components continue to inherit theme variables.
- Existing theme tests pass after updating expected token values.
- No unrelated DocsView or landing-support worktree changes are staged or committed with the theme work.

## Verification Plan

- Run focused theme tests:
  - `pnpm exec vitest run src/styles/__tests__/darkThemeTokens.spec.ts`
  - `pnpm exec vitest run src/components/payment/__tests__/paymentThemeTokens.spec.ts`
- Run frontend typecheck if implementation touches TypeScript/Vue code beyond CSS and Tailwind config:
  - `pnpm typecheck`
- Run `git diff --check` before staging.
