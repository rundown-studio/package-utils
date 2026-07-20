import { type Cue, CueStartMode, getCueDefaults, type RundownCueOrderItem } from '@rundown-studio/types'
import { describe, expect, it } from 'vitest'
import {
  type BacktimeContext,
  backtimeSegment,
  computeBacktime,
  planBacktime,
  resolveBacktimeAnchor,
} from '../computeBacktime'

/**
 * npm run test -- computeBacktime.test.ts
 *
 * Scenarios mirror the client "Fix" menu and v1 close-gap API. Assertions
 * compare instant-to-instant, so they hold regardless of the machine timezone.
 */

const MIN = 60_000

function cue(id: string, over: Partial<Cue>): Cue {
  return { ...getCueDefaults(), id, ...over } as Cue
}

function order(cues: Cue[]): RundownCueOrderItem[] {
  return cues.map((c) => ({ id: c.id }))
}

describe('computeBacktime — single hard start (screenshot scenario)', () => {
  // cue1 FIXED 16:00/1m, cue2 16:01/10m, cue3 16:11/0s, cue4 FIXED 17:00 (anchor).
  // Gap above cue4 = 17:00 − 16:11 = 49m. First cue is the show start.
  function baseCtx(over: Partial<BacktimeContext> = {}): BacktimeContext {
    const cues = [
      cue('cue1', {
        startMode: CueStartMode.FIXED,
        startTime: new Date('2026-07-19T16:00:00.000Z'),
        duration: 1 * MIN,
      }),
      cue('cue2', { duration: 10 * MIN }),
      cue('cue3', { duration: 0 }),
      cue('cue4', {
        startMode: CueStartMode.FIXED,
        startTime: new Date('2026-07-19T17:00:00.000Z'),
        duration: 0,
      }),
      cue('cue5', { duration: 0 }),
    ]
    return {
      cues,
      cueOrder: order(cues),
      rundownStartTime: new Date('2026-07-19T16:00:00.000Z'),
      timezone: 'UTC',
      runner: null,
      ...over,
    }
  }

  it('resolves the 49m gap with the first cue governing', () => {
    const anchor = resolveBacktimeAnchor(baseCtx(), 'cue4')
    expect(anchor).not.toBeNull()
    expect(anchor?.differenceMs).toBe(49 * MIN)
    expect(anchor?.governingCueId).toBe('cue1')
    expect(anchor?.governingIsFirstCue).toBe(true)
  })

  it('returns no_gap for a flexible cue', () => {
    expect(computeBacktime({ ctx: baseCtx(), anchorCueId: 'cue2', strategy: 'move_hard_start' })).toEqual({
      error: 'no_gap',
    })
  })

  it('move_hard_start pulls the anchor to 16:11', () => {
    const res = computeBacktime({ ctx: baseCtx(), anchorCueId: 'cue4', strategy: 'move_hard_start' })
    expect('write' in res && res.write).toEqual({
      kind: 'cue_start_time',
      cueId: 'cue4',
      startTime: new Date('2026-07-19T16:11:00.000Z'),
      isFirstCue: false,
    })
  })

  it('move_show_start moves the first cue to 16:49 (durations unchanged)', () => {
    const res = computeBacktime({ ctx: baseCtx(), anchorCueId: 'cue4', strategy: 'move_show_start' })
    expect('write' in res && res.write).toEqual({
      kind: 'cue_start_time',
      cueId: 'cue1',
      startTime: new Date('2026-07-19T16:49:00.000Z'),
      isFirstCue: true,
    })
  })

  it('move_show_start anchors on the resolved start, not a drifted rundownStartTime', () => {
    const res = computeBacktime({
      ctx: baseCtx({ rundownStartTime: new Date('2026-07-19T17:38:00.000Z') }),
      anchorCueId: 'cue4',
      strategy: 'move_show_start',
    })
    // Still 16:49: the engine pins cue1's FIXED 16:00 regardless of rundownStartTime.
    expect('write' in res && res.write.startTime).toEqual(new Date('2026-07-19T16:49:00.000Z'))
  })

  it('absorb_into_cue stretches cue2 from 10m to 59m', () => {
    const res = computeBacktime({
      ctx: baseCtx(),
      anchorCueId: 'cue4',
      strategy: 'absorb_into_cue',
      absorbCueId: 'cue2',
    })
    expect('write' in res && res.write).toEqual({
      kind: 'cue_duration',
      cueId: 'cue2',
      cueDuration: 59 * MIN,
      isFirstCue: false,
    })
  })

  it('absorb_into_cue requires absorb_cue_id', () => {
    expect(computeBacktime({ ctx: baseCtx(), anchorCueId: 'cue4', strategy: 'absorb_into_cue' })).toEqual({
      error: 'absorb_cue_id_required',
    })
  })

  it('absorb_into_cue rejects a cue below the anchor', () => {
    expect(
      computeBacktime({
        ctx: baseCtx(),
        anchorCueId: 'cue4',
        strategy: 'absorb_into_cue',
        absorbCueId: 'cue5',
      }),
    ).toEqual({ error: 'absorb_cue_not_in_segment' })
  })
})

describe('computeBacktime — multiple hard starts above the anchor', () => {
  // cueA FIXED 16:00/10m, cueB 10m, cueC FIXED 17:00/5m (intervening), cueD 5m,
  // cueE FIXED 18:00 (anchor). Gap above cueE = 18:00 − 17:10 = 50m, fed by the
  // run below cueC (the governing hard start), NOT the whole show.
  function multiCtx(): BacktimeContext {
    const cues = [
      cue('cueA', {
        startMode: CueStartMode.FIXED,
        startTime: new Date('2026-07-19T16:00:00.000Z'),
        duration: 10 * MIN,
      }),
      cue('cueB', { duration: 10 * MIN }),
      cue('cueC', {
        startMode: CueStartMode.FIXED,
        startTime: new Date('2026-07-19T17:00:00.000Z'),
        duration: 5 * MIN,
      }),
      cue('cueD', { duration: 5 * MIN }),
      cue('cueE', {
        startMode: CueStartMode.FIXED,
        startTime: new Date('2026-07-19T18:00:00.000Z'),
        duration: 0,
      }),
    ]
    return {
      cues,
      cueOrder: order(cues),
      rundownStartTime: new Date('2026-07-19T16:00:00.000Z'),
      timezone: 'UTC',
      runner: null,
    }
  }

  it('governing cue is the nearest hard start above (cueC), not the first cue', () => {
    const anchor = resolveBacktimeAnchor(multiCtx(), 'cueE')
    expect(anchor?.governingCueId).toBe('cueC')
    expect(anchor?.governingIsFirstCue).toBe(false)
    expect(anchor?.differenceMs).toBe(50 * MIN)
  })

  it('move_show_start moves the governing cue (cueC → 17:50), not cueA', () => {
    const res = computeBacktime({ ctx: multiCtx(), anchorCueId: 'cueE', strategy: 'move_show_start' })
    expect('write' in res && res.write).toEqual({
      kind: 'cue_start_time',
      cueId: 'cueC',
      startTime: new Date('2026-07-19T17:50:00.000Z'),
      isFirstCue: false,
    })
  })

  it('segment is scoped to cueC..cueD, excluding cueA/cueB', () => {
    const anchor = resolveBacktimeAnchor(multiCtx(), 'cueE')
    expect(backtimeSegment(multiCtx(), 'cueE', anchor?.governingCueId ?? null).map((c) => c.id)).toEqual([
      'cueC',
      'cueD',
    ])
  })

  it('absorb into a cue above the governing hard start is rejected', () => {
    expect(
      computeBacktime({
        ctx: multiCtx(),
        anchorCueId: 'cueE',
        strategy: 'absorb_into_cue',
        absorbCueId: 'cueB',
      }),
    ).toEqual({ error: 'absorb_cue_not_in_segment' })
  })

  it('absorb into a cue within the segment works (cueD 5m → 55m)', () => {
    const res = computeBacktime({
      ctx: multiCtx(),
      anchorCueId: 'cueE',
      strategy: 'absorb_into_cue',
      absorbCueId: 'cueD',
    })
    expect('write' in res && res.write.cueDuration).toBe(55 * MIN)
  })
})

describe('planBacktime — overlap guards', () => {
  it('rejects absorbing an overlap larger than the cue duration', () => {
    const cues = [
      cue('c1', {
        startMode: CueStartMode.FIXED,
        startTime: new Date('2026-07-19T16:00:00.000Z'),
        duration: 10 * MIN,
      }),
      cue('c2', { duration: 2 * MIN }),
      // Anchor before the run above ends → overlap.
      cue('c3', {
        startMode: CueStartMode.FIXED,
        startTime: new Date('2026-07-19T16:05:00.000Z'),
        duration: 0,
      }),
    ]
    const ctx: BacktimeContext = {
      cues,
      cueOrder: order(cues),
      rundownStartTime: new Date('2026-07-19T16:00:00.000Z'),
      timezone: 'UTC',
      runner: null,
    }
    const anchor = resolveBacktimeAnchor(ctx, 'c3')
    expect(anchor?.differenceMs).toBeLessThan(0)
    // c2 is 2m; overlap is 7m → would go negative.
    expect(
      planBacktime({ ctx, anchorCueId: 'c3', anchor: anchor!, strategy: 'absorb_into_cue', absorbCueId: 'c2' }),
    ).toEqual({ error: 'absorb_would_go_negative' })
  })
})
