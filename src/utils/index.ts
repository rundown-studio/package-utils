// Version-coupled public-API projections live under one namespace so they stay
// delimited from the version-agnostic primitives below and a future v2 slots in
// cleanly as `export * as ApiV2Utils`. The `Utils` suffix matches the repo's
// `import * as FooUtils` idiom and keeps the value-namespace visibly distinct
// from the `ApiV1*` wire-type family (which lives in @rundown-studio/types).
// Consumers: `import { ApiV1Utils }` → `ApiV1Utils.toPublicCue`.
export * as ApiV1Utils from './api-v1'
// `cellHtmlToPlainText` flattens stored cell HTML to plain text. Not tied to any
// API version — shared by the v0/v1 APIs, the realtime SSE body, AND CSV export —
// so it lives flat here, NOT under ApiV1Utils. (The public-vocabulary cell helpers
// in api-v1/cellHtml.ts — the transitional `rs-*` adapter — stay namespaced.)
export * from './buildParentGroupMap'
export * from './buildParentSkipMap'
export * from './cellHtmlToPlainText'
export * from './computeBacktime'
export * from './createTimestamps'
export * from './csv-import/parseCueNumbersColumn'
export * from './csv-import/parseDurationToMs'
export * from './csv-import/parseTimeToDate'
export * from './epochForScope'
export * from './fastDeepEqual'
export * from './firstPlayableCueId'
export * from './flattenCueOrderItems'
export * from './getChildrenTimestamps'
export * from './getIndexWithPrefix'
export * from './getResizedImageURL'
export * from './getRunnerState'
export * from './getTimestampSpanDuration'
export * from './moveCues'
export * from './parseSnapshot'
export * from './scopeKind'
