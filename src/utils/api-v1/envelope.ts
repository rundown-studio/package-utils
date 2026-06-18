import type { ApiV1RedirectEnvelope, ApiV1ResponseMeta, ApiV1SuccessEnvelope } from '@rundown-studio/types'

/**
 * The uniform v1 response envelope, built once for both halves of the API.
 *
 * These are PURE builders — no Express coupling. Each consumer keeps a thin
 * wrapper that reads its framework's request/clock and calls these: Functions'
 * `sendSuccess`/`sendRedirect` (reading `req.requestId`/`req.serverTime`) and
 * compute-engine's realtime poll responses (generating the id + passing
 * `serverTime`). One builder so a poll against CE is byte-compatible with the
 * same poll against Functions — same shape, same `req_…` id format.
 */

/**
 * Mint a request id in the canonical `req_<24 hex>` format. Used by surfaces
 * that don't have request-id middleware (the realtime poll responses); Functions
 * stamps the same format in its `requestId` middleware.
 */
export function generateRequestId(): string {
  // Web Crypto global (Node 19+ and browsers) — keeps this package isomorphic
  // with no `node:crypto` / `@types/node` dependency.
  return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`
}

/**
 * Uniform v1 success envelope: `{ ok, message, data, included?, meta }`. `data`
 * is the primary resource alone; sideloaded relations (`?include=`) ride in the
 * optional `included` sibling, emitted only when something was sideloaded.
 *
 * `meta` extras (e.g. `applied_includes`, or a populated `side_effects`) are
 * merged over the baked `{ request_id, server_time, side_effects: [] }` block —
 * later wins, exactly like Functions' previous inline `buildMeta`. Reads leave
 * `side_effects` empty; only writes populate it via the extras.
 */
export function buildSuccessBody<T>(payload: {
  message?: string
  data: T
  included?: Record<string, unknown>
  requestId: string
  serverTime: number
  meta?: Record<string, unknown>
}): ApiV1SuccessEnvelope<T> {
  const meta: ApiV1ResponseMeta = {
    request_id: payload.requestId,
    server_time: payload.serverTime,
    side_effects: [],
  }
  // Merge extras at runtime without widening the static meta type — extras like
  // `applied_includes` live on the wire (and in the Zod schema) but not on the
  // canonical `ApiV1ResponseMeta`.
  if (payload.meta) Object.assign(meta, payload.meta)

  const body: ApiV1SuccessEnvelope<T> = {
    ok: true,
    message: payload.message ?? 'OK',
    data: payload.data,
    meta,
  }
  if (payload.included !== undefined) body.included = payload.included
  return body
}

/**
 * 302 redirect envelope — restates the `Location` target as a flat `location`
 * field so a JSON client that doesn't auto-follow still gets it in-band. No
 * `data`: a redirect carries no resource. The caller sets the `Location` header.
 */
export function buildRedirectBody(payload: {
  message: string
  location: string
  requestId: string
  serverTime: number
}): ApiV1RedirectEnvelope {
  return {
    ok: true,
    message: payload.message,
    location: payload.location,
    meta: {
      request_id: payload.requestId,
      server_time: payload.serverTime,
      side_effects: [],
    },
  }
}
