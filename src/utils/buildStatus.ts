import type { Runner, RundownCue, RundownCueOrderItem } from '@rundown-studio/types'
import { CueType, RunnerState } from '@rundown-studio/types'
import type { ApiV1ControlState, ApiV1ActiveCue, ApiV1NextCue, ApiV1Status } from '@rundown-studio/types'
import { getRunnerState } from './getRunnerState'
import { flattenCueOrderItems } from './flattenCueOrderItems'

/**
 * Pure projection of the public control-plane status (`ApiV1Status`).
 *
 * The single source both the Functions REST `…/status` poll and the
 * compute-engine realtime `status` event read from — one code path, no drift.
 * No I/O: it takes already-loaded runner/cues/order and returns the shape, so
 * it's fully unit-testable without Firestore.
 *
 * State semantics:
 * - `running` — `paused_at: null`, the countdown is live.
 * - `paused`  — `paused_at` set; the clock is frozen at that timestamp.
 * - `stopped` — no runner OR runner ended; covers pre-show (`next_cue` is the
 *               first playable cue, or null on an empty rundown) and post-show
 *               (`next_cue` is null).
 */

/** The slice of a cue the status projection needs (id/type/title). */
export type CueLite = Pick<RundownCue, 'id' | 'type' | 'title'>

/**
 * Map (runner, timesnap.running) → the three-state public string.
 * `getRunnerState` is the canonical engine — never re-derive from raw fields.
 */
export function controlStateOf (runner: Runner | null): ApiV1ControlState {
  const internal = getRunnerState(runner)
  if (internal === RunnerState.PRESHOW || internal === RunnerState.ENDED) return 'stopped'
  // ONAIR — running vs paused is the timesnap's call.
  return runner!.timesnap.running ? 'running' : 'paused'
}

/**
 * Walk the cue-order tree and return the first `cue`-typed entry — used to
 * populate `next_cue` in the `stopped` (pre-show) state. Returns null on an
 * empty rundown or one that has only headings/groups.
 */
export function firstPlayableCueId (
  cueOrder: RundownCueOrderItem[],
  cueById: Map<string, CueLite>,
): string | null {
  for (const id of flattenCueOrderItems(cueOrder)) {
    const c = cueById.get(id)
    if (c && c.type === CueType.CUE) return id
  }
  return null
}

/**
 * Build the public status from a runner + a lookup of the rundown's cues. The
 * caller supplies `serverTime` so the response and any embedded side-effects
 * share one wall-clock reading.
 */
export function buildStatus (params: {
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
