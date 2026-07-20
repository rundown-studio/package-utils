import { addDays, applyDate } from '@rundown-studio/timeutils'
import type { Cue, RundownCueOrderItem, Runner } from '@rundown-studio/types'
import { CueStartMode, CueType } from '@rundown-studio/types'
import { createTimestamps } from './createTimestamps'
import { flattenCueOrderItems } from './flattenCueOrderItems'

/**
 * Backtiming: close the gap/overlap that appears above a hard-start (FIXED) cue.
 *
 * The timeline engine (`createTimestamps`) forward-fills up to a FIXED cue, then
 * hard-resets the clock to that cue's own start. So a FIXED cue with cues above
 * it shows a **gap** (cues above end early) or **overlap** (cues above run past),
 * where `differenceMs = anchor.start − previousCueEnd`. Three strategies each
 * collapse that difference to zero via a different lever the engine respects:
 *
 *   - `move_show_start` — move the GOVERNING hard start so the run it feeds lands
 *     exactly on the anchor. The governing cue is the nearest FIXED cue above the
 *     anchor (the first cue when none) — NOT always the first cue: an intervening
 *     hard start pins the clock, so cues above it can't affect this gap.
 *   - `move_hard_start` — move the anchor cue itself to meet the cues above.
 *   - `absorb_into_cue` — stretch/shrink one chosen cue in the governing segment.
 *
 * This module is the single source of truth shared by the client "Fix" menu and
 * the v1 `close-gap` API. It is pure (no I/O): callers pass cues/order/runner and
 * receive a `BacktimeWrite` describing exactly what to persist.
 */

export type BacktimeStrategy = 'move_show_start' | 'move_hard_start' | 'absorb_into_cue'

/** A single field write a fix performs, as plain data. */
export type BacktimeWrite =
  | { kind: 'cue_start_time'; cueId: string; startTime: Date; isFirstCue: boolean }
  | { kind: 'cue_duration'; cueId: string; cueDuration: number; isFirstCue: boolean }

/** Why a strategy could not be applied. */
export type BacktimeError =
  | 'no_gap'
  | 'no_governing_cue'
  | 'absorb_cue_id_required'
  | 'absorb_cue_not_in_segment'
  | 'absorb_would_go_negative'

export interface BacktimeContext {
  cues: Cue[]
  cueOrder: RundownCueOrderItem[]
  rundownStartTime: Date
  timezone?: string
  runner?: Runner | null
}

export interface BacktimeAnchor {
  /** Signed gap (>0) / overlap (<0) at the anchor, in ms. */
  differenceMs: number
  /** The anchor's resolved start (epoch ms). */
  anchorStartMs: number
  /** The governing hard start's resolved start (epoch ms). */
  governingStartMs: number
  /** Governing hard-start cue id (the one `move_show_start` moves), or null. */
  governingCueId: string | null
  /** Whether the governing cue is the first cue (→ write also syncs rundown start). */
  governingIsFirstCue: boolean
}

/**
 * Resolve the gap/overlap at `anchorCueId` off the computed timeline, plus the
 * governing hard start. Returns null when the anchor isn't a FIXED cue that has
 * a gap/overlap (nothing to fix).
 */
export function resolveBacktimeAnchor(ctx: BacktimeContext, anchorCueId: string): BacktimeAnchor | null {
  const anchor = ctx.cues.find((c) => c.id === anchorCueId)
  if (!anchor || anchor.type !== CueType.CUE) return null
  if (anchor.startMode !== CueStartMode.FIXED) return null

  const timestamps = createTimestamps(ctx.cues, ctx.cueOrder, ctx.runner ?? null, ctx.rundownStartTime, {
    timezone: ctx.timezone ?? 'UTC',
  })
  const anchorTs = timestamps.cues[anchorCueId]
  if (!anchorTs) return null

  const orderedIds = flattenCueOrderItems(ctx.cueOrder)
  const anchorIndex = orderedIds.indexOf(anchorCueId)
  const typeById = new Map(ctx.cues.map((c) => [c.id, c.type]))
  const startModeById = new Map(ctx.cues.map((c) => [c.id, c.startMode]))

  // Previous CUE-type cue's resolved end.
  let prevEndMs: number | null = null
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const id = orderedIds[i]
    if (typeById.get(id) !== CueType.CUE) continue
    const ts = timestamps.cues[id]
    if (!ts) continue
    prevEndMs = ts.actual.start.getTime() + ts.actual.duration
    break
  }
  if (prevEndMs == null) return null

  const anchorStartMs = anchorTs.actual.start.getTime()
  const differenceMs = anchorStartMs - prevEndMs

  // Governing hard start: nearest FIXED cue strictly above; first cue when none.
  let governingCueId: string | null = null
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const id = orderedIds[i]
    if (typeById.get(id) !== CueType.CUE) continue
    if (startModeById.get(id) === CueStartMode.FIXED) {
      governingCueId = id
      break
    }
  }
  const firstCueId = orderedIds.find((id) => typeById.get(id) === CueType.CUE) ?? null
  if (governingCueId == null) governingCueId = firstCueId

  const governingStartMs = governingCueId
    ? timestamps.cues[governingCueId].actual.start.getTime()
    : ctx.rundownStartTime.getTime()

  return {
    differenceMs,
    anchorStartMs,
    governingStartMs,
    governingCueId,
    governingIsFirstCue: governingCueId != null && governingCueId === firstCueId,
  }
}

/**
 * CUE-type cues that feed the anchor's gap: those in run order between the
 * governing hard start (inclusive) and the anchor (exclusive). Cues above the
 * governing hard start can't affect the anchor, so absorbing into them would be
 * a silent no-op — they're excluded here.
 */
export function backtimeSegment(ctx: BacktimeContext, anchorCueId: string, governingCueId: string | null): Cue[] {
  const orderedIds = flattenCueOrderItems(ctx.cueOrder)
  const anchorIndex = orderedIds.indexOf(anchorCueId)
  if (anchorIndex <= 0) return []
  const fromIndex = governingCueId != null ? orderedIds.indexOf(governingCueId) : 0
  const byId = new Map(ctx.cues.map((c) => [c.id, c]))
  return orderedIds
    .slice(Math.max(fromIndex, 0), anchorIndex)
    .map((id) => byId.get(id))
    .filter((c): c is Cue => c != null && c.type === CueType.CUE)
}

/**
 * New hard-start instant when moving the anchor cue itself: `startTime −
 * differenceMs`, re-anchored to the cue's intended calendar day so the
 * wall-clock moves by exactly `differenceMs` across DST/multi-day. Mirrors the
 * engine's `startDatePlus` handling.
 */
function moveHardStartInstant(params: {
  cueStartTime: Date
  startDatePlus: number
  differenceMs: number
  rundownStartTime: Date
  timezone: string
}): Date {
  const { cueStartTime, startDatePlus, differenceMs, rundownStartTime, timezone } = params
  const shifted = new Date(cueStartTime.getTime() - differenceMs)
  const dayAnchor = addDays(rundownStartTime, startDatePlus, { timezone })
  return applyDate(shifted, dayAnchor, { timezone })
}

/**
 * Plan the single write a strategy performs against a resolved anchor. Returns
 * `{ write }` or `{ error }` (caller maps the error to UI state / a 4xx).
 */
export function planBacktime(params: {
  ctx: BacktimeContext
  anchorCueId: string
  anchor: BacktimeAnchor
  strategy: BacktimeStrategy
  absorbCueId?: string
}): { write: BacktimeWrite } | { error: BacktimeError } {
  const { ctx, anchorCueId, anchor, strategy, absorbCueId } = params
  const { differenceMs, governingStartMs } = anchor
  const timezone = ctx.timezone ?? 'UTC'

  if (strategy === 'move_hard_start') {
    const anchorCue = ctx.cues.find((c) => c.id === anchorCueId)
    // Anchor is FIXED (resolveBacktimeAnchor gated), so startTime is non-null.
    const startTime = moveHardStartInstant({
      cueStartTime: anchorCue?.startTime as Date,
      startDatePlus: anchorCue?.startDatePlus ?? 0,
      differenceMs,
      rundownStartTime: ctx.rundownStartTime,
      timezone,
    })
    // The anchor has cues above it, so it is never the first cue.
    return { write: { kind: 'cue_start_time', cueId: anchorCueId, startTime, isFirstCue: false } }
  }

  if (strategy === 'move_show_start') {
    if (!anchor.governingCueId) return { error: 'no_governing_cue' }
    return {
      write: {
        kind: 'cue_start_time',
        cueId: anchor.governingCueId,
        startTime: new Date(governingStartMs + differenceMs),
        isFirstCue: anchor.governingIsFirstCue,
      },
    }
  }

  // absorb_into_cue
  if (!absorbCueId) return { error: 'absorb_cue_id_required' }
  const segment = backtimeSegment(ctx, anchorCueId, anchor.governingCueId)
  const target = segment.find((c) => c.id === absorbCueId)
  if (!target) return { error: 'absorb_cue_not_in_segment' }
  const cueDuration = target.duration + differenceMs
  if (cueDuration < 0) return { error: 'absorb_would_go_negative' }
  return {
    write: {
      kind: 'cue_duration',
      cueId: absorbCueId,
      cueDuration,
      isFirstCue: anchor.governingIsFirstCue && absorbCueId === anchor.governingCueId,
    },
  }
}

/**
 * One-shot: resolve the anchor and plan the strategy in a single call. Returns
 * `{ error: 'no_gap' }` when the cue has no gap/overlap to close.
 */
export function computeBacktime(params: {
  ctx: BacktimeContext
  anchorCueId: string
  strategy: BacktimeStrategy
  absorbCueId?: string
}): { write: BacktimeWrite; anchor: BacktimeAnchor } | { error: BacktimeError } {
  const anchor = resolveBacktimeAnchor(params.ctx, params.anchorCueId)
  if (!anchor) return { error: 'no_gap' }
  const planned = planBacktime({ ...params, anchor })
  if ('error' in planned) return planned
  return { write: planned.write, anchor }
}
