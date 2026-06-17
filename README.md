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

The upstream re-exports are listed **explicitly** rather than via `export *` as a
**migration checklist**: the explicit list doubles as the phase-out tracker — as
each constant moves into a local module here, remove it from the upstream block
and export the local copy instead. When the list is empty, the
`@rundown-studio/consts` dependency can be dropped.

> Historically, explicit listing was also *required* for correctness: a bare
> `export *` from an external package did not survive **tsup**'s esbuild ESM
> bundle through a barrel — esbuild could not enumerate an external module's
> names for ESM's static export list, so every re-exported name silently became
> `undefined` for `import` consumers. The current bundler, **tsdown** (Rolldown),
> handles `export *` from externals correctly, so this is no longer a constraint
> — but the explicit list is kept for the checklist above.

## Commands

- **Build:** `npm run build` (tsdown → CJS + ESM + types in `dist/`)
- **Test:** `npm test` (watch), `npm run test:ci` (single run)
- **Typecheck:** `npm run typecheck`
- **Lint:** `npm run lint` (`npm run lint:fix` to auto-fix)

## Pinned Dependencies

- no issues
