# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`@rundown-studio/utils` is a shared package for [Rundown Studio](https://github.com/rundown-studio/rundown-studio) — a broadcast/production rundown management system (React + Firebase + real-time collaboration). It ships two kinds of exports from a single flat namespace: **utils** (pure functions for timestamp calculation, cue ordering, snapshot parsing, CSV import, API-token scope/epoch resolution, …) and **consts** (shared constants — collection names, colour palettes, tolerances, token-rotation epochs, …). Used across the client, functions, and compute-engine services.

Published to GitHub Packages npm registry. Depends on sibling packages: `@rundown-studio/types`, `@rundown-studio/consts`, `@rundown-studio/timeutils`. Note: `@rundown-studio/consts` is being folded into this package and phased out (see Architecture).

## Commands

- **Build:** `npm run build` (uses tsdown, outputs CJS + ESM + types to `dist/`)
- **Test:** `npm test` (vitest in watch mode), `npm run test:ci` (single run)
- **Single test:** `npx vitest run src/utils/__tests__/createTimestamps.test.ts`
- **Typecheck:** `npm run typecheck`
- **Lint/format:** `npm run lint` (biome check), `npm run lint:fix` (`biome check --write` to auto-fix)

## Architecture

`src/index.ts` is the entry; it re-exports two barrels into a single flat namespace:

- `src/utils/` — utility functions, one util per file, barreled by `src/utils/index.ts`. CSV helpers live in `src/utils/csv-import/`.
- `src/consts/` — constants, barreled by `src/consts/index.ts`.

**Consts and the `@rundown-studio/consts` phase-out:** constants are being consolidated into this package and the standalone `@rundown-studio/consts` package is being retired. `src/consts/index.ts` re-exports the upstream constants **explicitly by name** (not `export *`) and bridges the transition — constants already migrated locally (e.g. `TOKEN_EPOCHS` in `tokenEpochs.ts`) are exported from their local module and struck from the upstream list. The explicit listing is deliberate: it doubles as the migration checklist. (Historically it was also *required* — a bare `export *` from an external package did **not** survive tsup's esbuild ESM bundle through a barrel, so names became `undefined` for `import` consumers; tsdown/Rolldown handles `export *` from externals correctly, so that's no longer a constraint, but the explicit list is kept for the checklist.) When migrating a const, move it local, export it from `src/consts/`, and remove it from the upstream block; when the block is empty the dependency can be dropped.

**Core domain concept:** A rundown has an ordered list of cues (with groups/headings). A runner tracks live playback state. `createTimestamps()` is the central function — it combines cues, cue order, runner state, and start time to produce "original" (planned) and "actual" (live) timestamp data for each cue.

Key types come from `@rundown-studio/types`: `RundownCue`, `RundownCueOrderItem`, `Runner`. Time utilities from `@rundown-studio/timeutils`. Timezone handling is critical throughout — always use `date-fns` + `@date-fns/tz` with explicit timezone parameters, never bare `new Date()` arithmetic for time-of-day operations.

## Code Style

- Single quotes, no semicolons, 2-space indent
- Trailing commas in multiline, space before function parens
- 1TBS brace style, arrow parens always
- Enforced by Biome (`biome.json`): formatter + recommended lint rules, line width 120
- `noExplicitAny` is off; tests disable `noUnusedExpressions`

## Test Layout

Tests are colocated with the source they cover, in a sibling `__tests__/` folder (e.g. `src/utils/__tests__/`, `src/utils/csv-import/__tests__/`). Convention: **one test file per util, with the same name** as the util. To keep files manageable, a util may use dedicated fixture files or, as an exception, split into two test files (e.g. `parseTimeToDate.test.ts` + `parseTimeToDate.timezone.test.ts`). All tests use vitest.

**Constants are not tested** — there's nothing to assert about a literal, so `src/consts/` has no `__tests__/`. Test the utils that consume them instead.
