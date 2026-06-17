import type {
  ApiV1ActiveCue,
  ApiV1ControlState,
  ApiV1NextCue,
  ApiV1Status,
  RundownCueOrderItem,
  Runner,
} from '@rundown-studio/types'
import { RunnerState } from '@rundown-studio/types'
import { type CueLite, firstPlayableCueId } from '../utils/firstPlayableCueId'
import { getRunnerState } from '../utils/getRunnerState'

/**
 * Projection of the public control-plane status (`ApiV1Status`).
 *
 * This module is api-v1's serializer: it knows the public wire vocabulary
 * (snake_case fields, the three-state string, the active/next slices) and maps
 * internal runner/cue data into it. The general-purpose primitives it leans on
 * (`getRunnerState`, `firstPlayableCueId`) live in `../utils` and stay
 * api-version-agnostic — only this layer is coupled to the v1 contract.
 *
 * State semantics:
 * - `running` — `paused_at: null`, the countdown is live.
 * - `paused`  — `paused_at` set; the clock is frozen at that timestamp.
 * - `stopped` — no runner OR runner ended; covers pre-show (`next_cue` is the
 *               first playable cue, or null on an empty rundown) and post-show
 *               (`next_cue` is null).
 */

/**
 * Map (runner, timesnap.running) → the three-state public string.
 * `getRunnerState` is the canonical engine — never re-derive from raw fields.
 */
export function controlStateOf(runner: Runner | null): ApiV1ControlState {
  const internal = getRunnerState(runner)
  if (internal === RunnerState.PRESHOW || internal === RunnerState.ENDED) return 'stopped'
  // ONAIR — running vs paused is the timesnap's call.
  return runner!.timesnap.running ? 'running' : 'paused'
}

/**
 * Build the public status from a runner + a lookup of the rundown's cues. The
 * caller supplies `serverTime` so the response and any embedded side-effects
 * share one wall-clock reading.
 */
export function buildStatus(params: {
  runner: Runner | null
  cueById: Map<string, CueLite>
  cueOrder: RundownCueOrderItem[]
  serverTime: number
}): ApiV1Status {
  const { runner, cueById, cueOrder, serverTime } = params
  const state = controlStateOf(runner)

  if (state === 'stopped') {
    // PRESHOW → first playable cue; ENDED → no next.
    const internal = getRunnerState(runner)
    const nextId = internal === RunnerState.PRESHOW ? firstPlayableCueId(cueOrder, cueById) : null
    const next = nextId ? cueById.get(nextId) : null
    return {
      server_time: serverTime,
      state,
      active_cue: null,
      next_cue: next ? { id: next.id, title: next.title } : null,
    }
  }

  // running or paused — runner non-null, timesnap.cueId non-null.
  const ts = runner!.timesnap
  const active = ts.cueId ? cueById.get(ts.cueId) : undefined
  const activeCue: ApiV1ActiveCue | null = active
    ? {
        id: active.id,
        title: active.title,
        started_at: ts.kickoff,
        paused_at: ts.running ? null : ts.lastStop,
        duration_ms: ts.deadline - ts.kickoff,
      }
    : null

  const nextId = runner!.nextCueId
  const next = nextId ? cueById.get(nextId) : undefined
  const nextCue: ApiV1NextCue | null = next ? { id: next.id, title: next.title } : null

  return {
    server_time: serverTime,
    state,
    active_cue: activeCue,
    next_cue: nextCue,
  }
}
