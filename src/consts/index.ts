// Upstream constants from @rundown-studio/consts, re-exported while that package
// is folded into @rundown-studio/utils and phased out (see README).
//
// These are listed explicitly rather than via `export *` because this list IS
// the migration checklist: as each constant moves into a local module here,
// strike it from this block and export the local copy instead. When the list is
// empty, the dependency can be dropped.
//
// (Under the old tsup/esbuild build, explicit listing was also *required* — a
// bare `export *` from an external package did not survive the ESM bundle and
// names became `undefined` for `import` consumers. The current bundler, tsdown
// (Rolldown), handles `export *` from externals correctly, so this is no longer
// a hard constraint — but the explicit list is kept for the checklist above.)
export {
  API_TOKEN_COLLECTION,
  APIV0_CUE_KEYS,
  APIV0_RUNDOWN_KEYS,
  CELL_COLLECTION,
  CELL_HIGHLIGHT_COLORS,
  CELL_SELECT_COLORS,
  CELL_TEXT_COLORS,
  CODE_COLLECTION,
  COLUMN_COLLECTION,
  CUE_BACKGROUND_COLORS,
  CUE_COLLECTION,
  CUE_OVERLAP_TOLERANCE,
  DEV,
  EVENT_COLLECTION,
  HISTORY_COLLECTION,
  PROD,
  PRODUCT_COLLECTION,
  PROMPTER_COLLECTION,
  RUNDOWN_COLLECTION,
  RUNNER_COLLECTION,
  SUB_COLLECTION,
  TEAM_COLLECTION,
  TXN_COLLECTION,
} from '@rundown-studio/consts'

// Migrated off @rundown-studio/consts — local copy is now the source of truth.
export { TOKEN_EPOCHS } from './tokenEpochs'
