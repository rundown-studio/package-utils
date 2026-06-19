import { Features } from '@rundown-studio/types'

/**
 * Shared rate-limit definition for the public api-v1 surface.
 *
 * The Functions REST limiter and the compute-engine status/countdown poll
 * limiter share ONE Redis bucket, so every field here MUST be byte-identical on
 * both sides — that is the whole reason this lives in the shared package
 * instead of being declared per service. If a value drifts between the two, the
 * bucket silently splits (a team gets double its budget) or double-counts.
 *
 * `limits` is keyed by api-v1 access BUCKET, not by plan name. The bucket is
 * decided by the `API` Paddle PRODUCT FEATURE FLAG (see
 * `apiRateBucketFromFeatures`), which can be toggled per product with no code
 * deploy. Do NOT collapse this into a `free`/`paid` plan-name check — that would
 * re-bake a gate we deliberately keep in the feature flags.
 */
export const APIV1_RATE_LIMIT = {
  windowMs: 60_000,
  redisPrefix: 'rl:apiv1:',
  // Teams that skip the limiter entirely — the shared e2e team (one token,
  // parallel runs) would otherwise trip the restricted cap on every run.
  bypassTeamIds: ['VzJQQxHf07fpZ2QOFXrj'] as readonly string[],
  limits: {
    restricted: 20, // no API feature flag
    unrestricted: 120, // API feature flag present
  },
} as const

/**
 * api-v1 rate-limit bucket. Driven by the `API` product feature flag, NOT by
 * plan name — see `APIV1_RATE_LIMIT`.
 */
export type ApiRateBucket = keyof typeof APIV1_RATE_LIMIT.limits

/**
 * Resolve the api-v1 rate-limit bucket from a team's plan features. Presence of
 * the `API` product feature flag → `unrestricted`; absence → `restricted`.
 * Shared by the Functions REST limiter and compute-engine so the two never
 * disagree on what grants the higher limit. Takes `string[]` (not `Features[]`)
 * so compute-engine can pass the feature list straight off the JSON wire.
 */
export function apiRateBucketFromFeatures(features: readonly string[]): ApiRateBucket {
  return features.includes(Features.API) ? 'unrestricted' : 'restricted'
}

/**
 * Per-team Redis bucket key. Identical shape on both surfaces so a team's REST
 * calls and its status/countdown polls draw from the same bucket. The IP
 * fallback (for tokens without a team) stays in each limiter — it needs the
 * express `ipKeyGenerator` for IPv6 grouping.
 */
export function rateLimitBucketKey(teamId: string): string {
  return `team:${teamId}`
}

/**
 * The shared parts of the 429 problem, so both surfaces emit identical text and
 * `details`. The caller wraps these with status 429 + instance (Functions via
 * its error class, compute-engine via `sendProblem`).
 */
export function rateLimitProblem(
  bucket: ApiRateBucket,
  retryAfterSeconds: number,
): {
  code: string
  detail: string
  details: Record<string, unknown>
} {
  const limit = APIV1_RATE_LIMIT.limits[bucket]
  const upgradeHint =
    bucket === 'restricted'
      ? ` Upgrade for ${APIV1_RATE_LIMIT.limits.unrestricted}/min: https://rundownstudio.app/pricing.`
      : ''
  return {
    code: 'rate_limit.exceeded',
    detail: `Rate limit reached for your team (${limit}/min on the ${bucket} bucket).${upgradeHint} See RateLimit-* response headers for the limit, current usage, and reset time.`,
    details: {
      bucket,
      limit,
      window_seconds: APIV1_RATE_LIMIT.windowMs / 1000,
      retry_after_seconds: retryAfterSeconds,
    },
  }
}
