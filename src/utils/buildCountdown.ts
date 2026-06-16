import type { PublicStatus, PublicCountdown } from '@rundown-studio/types'
import { formatCountdown } from '@rundown-studio/timeutils'

/**
 * Project a `PublicStatus` into the `PublicCountdown` wire shape — the same pure
 * function the Functions REST `…/countdown` poll and the compute-engine read
 * surface both call, so the two return byte-identical countdowns.
 *
 * Pure: the caller passes a `PublicStatus` already stamped with a `server_time`,
 * so a sibling `…/status` read built from the same data yields matching clock
 * values. Three states:
 * - `running` — `active_cue` populated; `remaining_ms` ticks down live.
 * - `paused`  — `active_cue` populated; `remaining_ms` frozen at the pause.
 * - `stopped` — `active_cue` null (no countdown when no runner is active).
 *
 * `remaining_ms` is the raw signed value — negative is overtime; consumers clamp
 * if they want to hide it. `remaining.formatted` includes the `+` prefix.
 */
export function buildCountdown (status: PublicStatus): PublicCountdown {
  const { state, server_time, active_cue } = status

  if (!active_cue) {
    return { state, server_time, active_cue: null }
  }

  // Running counts down from the deadline against server_time; paused freezes at
  // the pause instant (`started_at + duration_ms - paused_at`).
  const deadline = active_cue.started_at + active_cue.duration_ms
  const anchor = active_cue.paused_at ?? server_time
  const remainingMs = deadline - anchor

  return {
    state,
    server_time,
    active_cue: {
      cue_id: active_cue.id,
      title: active_cue.title,
      duration_ms: active_cue.duration_ms,
      remaining_ms: remainingMs,
      remaining: formatCountdown(remainingMs),
    },
  }
}
