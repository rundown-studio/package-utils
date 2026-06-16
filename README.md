# Rundown Studio Shared Utils

Shared, dependency-light building blocks for [Rundown Studio](https://github.com/rundown-studio/rundown-studio), used across the client, functions, and compute-engine services. The package ships two kinds of exports from a single entry point:

- **Utils** — pure functions for timestamp calculation, cue ordering, snapshot parsing, CSV import, API-token scope/epoch resolution, and related rundown operations.
- **Consts** — shared constants (collection names, colour palettes, tolerances, API-token rotation epochs, …).

Everything is exported flat from the package root, so consumers import from one place:

```ts
import { createTimestamps, CUE_OVERLAP_TOLERANCE, TOKEN_EPOCHS } from '@rundown-studio/utils'
```

## Install

```sh
echo "@rundown-studio:registry=https://npm.pkg.github.com" >> .npmrc

npm i @rundown-studio/utils
```

## Structure

```
src/
  index.ts        # entry — re-exports ./utils and ./consts
  utils/
    index.ts      # barrel for all utility functions
    *.ts          # one util per file
    csv-import/   # CSV parsing helpers
    __tests__/    # one test file per util (same name)
  consts/
    index.ts      # barrel for all constants
    tokenEpochs.ts # constants migrated into this package
    __tests__/
```

`src/index.ts` re-exports both barrels, so `./utils` and `./consts` stay
self-contained while the published surface is a single flat namespace.

### Consts and the `@rundown-studio/consts` phase-out

Constants are being consolidated into this package and the standalone
`@rundown-studio/consts` package is being phased out. `src/consts/index.ts`
bridges that transition:

- It **re-exports the upstream constants by name** from `@rundown-studio/consts`,
  so consumers can move to a single `@rundown-studio/utils` import today, before
  the migration is finished.
- Constants that have already been migrated (e.g. `TOKEN_EPOCHS` in
  `tokenEpochs.ts`) are exported from their **local** module instead and struck
  from the upstream re-export list.

The upstream re-exports are listed **explicitly** rather than via `export *` for
two reasons:

1. **ESM bundling.** A bare `export *` from an external package does not survive
   tsup's ESM bundle when re-exported through a barrel — esbuild cannot
   enumerate an external module's names for ESM's static export list, so every
   re-exported name silently becomes `undefined` for `import` consumers. Named
   re-exports are statically known and bundle correctly.
2. **Migration checklist.** The explicit list doubles as the phase-out tracker:
   as each constant moves into a local module here, remove it from the upstream
   block and export the local copy instead. When the list is empty, the
   `@rundown-studio/consts` dependency can be dropped.

## Commands

- **Build:** `npm run build` (tsup → CJS + ESM + types in `dist/`)
- **Test:** `npm test` (watch), `npm run test:ci` (single run)
- **Typecheck:** `npm run typecheck`
- **Lint:** `npm run lint` (`npm run lint:fix` to auto-fix)

## Pinned Dependencies

- no issues
