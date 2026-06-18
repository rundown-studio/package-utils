import type { ApiV1Problem } from '@rundown-studio/types'

/**
 * RFC 9457 problem+json builder + the error-catalog discovery pointers, shared
 * by both halves of the v1 API. Functions' `errorMiddleware` branches on its own
 * error classes to derive `{status, code, detail}` then calls `buildProblemBody`;
 * compute-engine's realtime surface does the same from its three error sites
 * (bad `?events=`, unauthorized, missing rundown). One builder so an error from
 * CE is byte-compatible with the same error class from Functions.
 */

/**
 * Stable base URL for the RFC 9457 `type` field — points at the error-catalog
 * page, with the code as a `#` anchor (e.g. `…/errors#auth.invalid_token`).
 * Single source so the URL can change in one place without drifting.
 */
export const PROBLEM_TYPE_PREFIX = 'https://rundownstudio.app/docs/api-v1/errors'

export function problemTypeUrl(code: string): string {
  return `${PROBLEM_TYPE_PREFIX}#${code}`
}

/**
 * Human-friendly documentation URL for an error code. Today it mirrors `type`;
 * once the docs catalog ships per-endpoint pages this can point at the specific
 * page while `type` stays the error anchor. Its own function so that split is a
 * one-line change.
 */
export function documentationUrl(code: string): string {
  return problemTypeUrl(code)
}

/**
 * Route path (under the /api-v1 app) that serves the raw OpenAPI YAML. Single
 * source so the served route and the advertised `SPEC_URL` can't drift apart.
 */
export const OPENAPI_SPEC_ROUTE = '/openapi.yml'

/**
 * Public URL of the served OpenAPI spec, advertised on every v1 error as
 * `spec_url`. An agent that hit a wrong verb/path can fetch this to discover the
 * real routes. Pinned to prod by design — the contract URL shouldn't vary per
 * environment.
 */
export const SPEC_URL = `https://app.rundownstudio.app/api-v1${OPENAPI_SPEC_ROUTE}`

const TITLE_BY_STATUS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  422: 'Unprocessable Entity',
  423: 'Locked',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
}

/**
 * Build the RFC 9457 problem+json body. `title` is resolved from `status`;
 * `type`/`documentation_url` are derived from `code`; `spec_url` is constant.
 * Callers supply the request-scoped `{ instance, requestId, serverTime }` and
 * the classified `{ status, code, detail, details? }`. `details` is omitted when
 * absent (not emitted as `undefined`).
 */
export function buildProblemBody(input: {
  status: number
  code: string
  detail: string
  instance: string
  requestId: string
  serverTime: number
  details?: Record<string, unknown>
}): ApiV1Problem {
  const body: ApiV1Problem = {
    type: problemTypeUrl(input.code),
    title: TITLE_BY_STATUS[input.status] ?? 'Error',
    status: input.status,
    code: input.code,
    detail: input.detail,
    instance: input.instance,
    request_id: input.requestId,
    server_time: input.serverTime,
    spec_url: SPEC_URL,
    documentation_url: documentationUrl(input.code),
  }
  if (input.details) body.details = input.details
  return body
}
