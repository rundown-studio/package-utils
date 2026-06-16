import { expect, test, describe } from 'vitest'
import type { ApiV1Status, ApiV1ActiveCue } from '@rundown-studio/types'
import { buildCountdown } from '../buildCountdown'

const stoppedStatus: ApiV1Status = {
  server_time: 1_716_393_600_000,
  state: 'stopped',
  active_cue: null,
  next_cue: { id: 'cue_first', title: 'Opening' },
}

const runningStatus = (overrides: Partial<ApiV1ActiveCue> = {}): ApiV1Status => ({
  server_time: 1_716_393_600_000,
  state: 'running',
  active_cue: {
    id: 'cue_abc',
    title: 'Opening monologue',
    started_at: 1_716_393_582_000, // 18s ago
    paused_at: null,
    duration_ms: 60_000,
    ...overrides,
  },
  next_cue: { id: 'cue_next', title: 'Sponsor read' },
})

const pausedStatus = (overrides: Partial<ApiV1ActiveCue> = {}): ApiV1Status => ({
  server_time: 1_716_393_600_000,
  state: 'paused',
  active_cue: {
    id: 'cue_abc',
    title: 'Opening monologue',
    started_at: 1_716_393_580_000, // 20s before pause
    paused_at: 1_716_393_595_000, // paused 15s in
    duration_ms: 60_000,
    ...overrides,
  },
  next_cue: null,
})

describe('buildCountdown', () => {
  test('stopped → active_cue null, state + server_time pass through', () => {
    expect(buildCountdown(stoppedStatus)).toEqual({
      state: 'stopped',
      server_time: 1_716_393_600_000,
      active_cue: null,
    })
  })

  test('running — remaining = started + duration - server_time', () => {
    // started 18s ago, 60s duration → 42s remaining
    const out = buildCountdown(runningStatus())
    expect(out.state).toBe('running')
    expect(out.server_time).toBe(1_716_393_600_000)
    expect(out.active_cue).toMatchObject({
      cue_id: 'cue_abc',
      title: 'Opening monologue',
      duration_ms: 60_000,
      remaining_ms: 42_000,
      remaining: {
        is_overtime: false,
        prefix: '',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 42,
        formatted: '00:42',
      },
    })
  })

  test('paused — remaining = started + duration - paused_at (server_time ignored)', () => {
    // started 20s before pause, paused 15s in, 60s duration → 45s frozen remaining
    const out = buildCountdown(pausedStatus())
    expect(out.state).toBe('paused')
    expect(out.active_cue).toMatchObject({
      remaining_ms: 45_000,
      remaining: {
        is_overtime: false,
        seconds: 45,
        formatted: '00:45',
      },
    })
  })

  test('paused — server_time advancing further does NOT change remaining_ms', () => {
    const a = buildCountdown(pausedStatus())
    const b = buildCountdown({ ...pausedStatus(), server_time: 1_716_393_600_000 + 5 * 60_000 })
    expect(a.active_cue!.remaining_ms).toBe(b.active_cue!.remaining_ms)
  })

  test('running overtime — remaining_ms negative, is_overtime true, + prefix', () => {
    // started 75s ago, 60s duration → -15s remaining (overtime)
    const out = buildCountdown(runningStatus({ started_at: 1_716_393_525_000 }))
    expect(out.active_cue!.remaining_ms).toBe(-15_000)
    expect(out.active_cue!.remaining).toEqual({
      is_overtime: true,
      prefix: '+',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 15,
      formatted: '+00:15',
    })
  })

  test('running — long cue formats with hours band', () => {
    // started 1m ago, 1h 25m duration → 1h 24m remaining
    const out = buildCountdown(runningStatus({
      started_at: 1_716_393_540_000,
      duration_ms: 5_100_000, // 1h 25m
    }))
    expect(out.active_cue!.remaining).toMatchObject({
      hours: 1,
      minutes: 24,
      seconds: 0,
      formatted: '1:24:00',
    })
  })

  test('running — remaining exactly zero is NOT overtime', () => {
    const out = buildCountdown(runningStatus({
      started_at: 1_716_393_540_000, // 60s ago
      duration_ms: 60_000, // exact deadline
    }))
    expect(out.active_cue!.remaining_ms).toBe(0)
    expect(out.active_cue!.remaining.is_overtime).toBe(false)
    expect(out.active_cue!.remaining.formatted).toBe('00:00')
  })
})
