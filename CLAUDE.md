# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`@rundown-studio/utils` is a shared utility package for [Rundown Studio](https://github.com/rundown-studio/rundown-studio) — a broadcast/production rundown management system (React + Firebase + real-time collaboration). This package provides pure functions for timestamp calculation, cue ordering, snapshot parsing, CSV import, and other rundown-related operations. It is used across the client, functions, and compute-engine services.

Published to GitHub Packages npm registry. Consumed by the main [Rundown Studio](https://github.com/rundown-studio/rundown-studio) app. Depends on sibling packages: `@rundown-studio/types`, `@rundown-studio/consts`, `@rundown-studio/timeutils`.

## Commands

- **Build:** `npm run build` (uses tsup, outputs CJS + ESM + types to `dist/`)
- **Test:** `npm test` (vitest in watch mode), `npm run test:ci` (single run)
- **Single test:** `npx vitest run tests/createTimestamps.test.ts`
- **Lint:** `npm run lint` (eslint with auto-fix)

## Architecture

All utilities are exported from `src/index.ts` as a flat namespace. No internal module boundaries beyond the `csv-import/` subdirectory.

**Core domain concept:** A rundown has an ordered list of cues (with groups/headings). A runner tracks live playback state. `createTimestamps()` is the central function — it combines cues, cue order, runner state, and start time to produce "original" (planned) and "actual" (live) timestamp data for each cue.

Key types come from `@rundown-studio/types`: `RundownCue`, `RundownCueOrderItem`, `Runner`. Time utilities from `@rundown-studio/timeutils`. Timezone handling uses `date-fns` + `@date-fns/tz`.

## Code Style

- Single quotes, no semicolons, 2-space indent
- Trailing commas in multiline, space before function parens
- 1TBS brace style, arrow parens always
- `@typescript-eslint/no-explicit-any` is off
- Unused vars prefixed with `_`

## Test Layout

Tests live in two places: `tests/` (top-level) and `src/csv-import/__tests__/`. Both use vitest. Some top-level test files in `tests/` mirror csv-import tests (e.g., `parseCueNumbersColumn.test.ts` exists in both locations).
