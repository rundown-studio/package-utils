/**
 * Deploy-time scope epochs for bulk API-token rotation.
 *
 * Minting stamps a token's `e` claim with the epoch for its scope; auth rejects
 * any token whose `e` is lower than the current value. Bumping a number here and
 * shipping a release therefore invalidates every token minted under the old
 * epoch — no Redis, no Firestore, no per-request I/O. Both the v1 mint/verify
 * path (functions) and the realtime read surface (compute-engine) resolve this
 * same table through `epochForScope`, so the two can never disagree on what has
 * been rotated.
 *
 * Bulk rotation is rare enough that "edit here, publish, bump consumers, deploy"
 * is the agreed invalidation mechanism — the cost of keeping rotation I/O-free.
 *
 * Accepted consequences of deploy-time config:
 * - Rolling deploys: while old and new revisions coexist after a bump, a token
 *   minted by an old instance can 401 on a new one until re-minted. Transient,
 *   bounded by the deploy window.
 * - Rollback: auth only rejects `e` LOWER than the configured epoch, so
 *   reverting a bump re-validates every token the bump had rotated away. Never
 *   roll an epoch backwards to "undo" — mint replacements instead.
 *
 * - `global` rotates every v1 token.
 * - `teams[teamId]` rotates all tokens of one team (including its
 *   rundown-scoped tokens).
 * - `rundowns[rundownId]` rotates the tokens scoped to one rundown.
 */
export const TOKEN_EPOCHS: {
  global: number
  teams: Record<string, number>
  rundowns: Record<string, number>
} = {
  // 0 = "no rotation has ever happened". Tokens minted before the epoch
  // mechanism carry `e: 0`, so starting above 0 would invalidate them all.
  // First real rotation bumps this to 1.
  global: 0,
  teams: {},
  rundowns: {},
}
