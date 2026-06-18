// Version-coupled public-API projections live under one namespace so they stay
// delimited from the version-agnostic primitives below and a future v2 slots in
// cleanly as `export * as ApiV2`. Consumers: `import { ApiV1 }` → `ApiV1.buildCue`.
export * as ApiV1 from './api-v1'
// `cellHtmlToPlainText` flattens stored cell HTML to plain text. Not tied to any
// API version — shared by the v0/v1 APIs, the realtime SSE body, AND CSV export —
// so it lives flat here, NOT under ApiV1. (The public-vocabulary cell helpers in
// api-v1/cellHtml.ts — the transitional `rs-*` adapter — stay namespaced.)
export * from './cellHtmlToPlainText'
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
