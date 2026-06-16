import { expect, test, describe } from 'vitest'
import { CueType, type Runner, type RundownCue, type RundownCueOrderItem } from '@rundown-studio/types'
import { buildStatus, controlStateOf } from '../buildStatus'

const cueRow = (id: string, type: CueType, title: string): Pick<RundownCue, 'id' | 'type' | 'title'> => ({
  id, type, title,
})

const mkRunner = (over: Partial<Runner> & { timesnap: Runner['timesnap'] }): Runner => ({
  id: 'run_1',
  rundownId: 'rnd_1',
  nextCueId: null,
  originalCues: {},
  elapsedCues: {},
  log: [],
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
})

describe('controlStateOf', () => {
  test('null runner → stopped (pre-show)', () => {
    expect(controlStateOf(null)).toBe('stopped')
  })

  test('runner with null cueId → stopped (ended)', () => {
    const runner = mkRunner({ timesnap: { cueId: null, running: false, kickoff: 0, lastStop: 0, deadline: 0 } })
    expect(controlStateOf(runner)).toBe('stopped')
  })

  test('ONAIR + running=true → running', () => {
    const runner = mkRunner({ timesnap: { cueId: 'c1', running: true, kickoff: 100, lastStop: 100, deadline: 200 } })
    expect(controlStateOf(runner)).toBe('running')
  })

  test('ONAIR + running=false → paused', () => {
    const runner = mkRunner({ timesnap: { cueId: 'c1', running: false, kickoff: 100, lastStop: 150, deadline: 200 } })
    expect(controlStateOf(runner)).toBe('paused')
  })
})

describe('buildStatus', () => {
  const cueById = new Map([
    ['c1', cueRow('c1', CueType.CUE, 'Opening')],
    ['c2', cueRow('c2', CueType.CUE, 'Guest intro')],
  ])
  const cueOrder: RundownCueOrderItem[] = [{ id: 'c1' }, { id: 'c2' }]

  test('null runner → stopped, next_cue is first playable', () => {
    const status = buildStatus({ runner: null, cueById, cueOrder, serverTime: 999 })
    expect(status).toEqual({
      server_time: 999,
      state: 'stopped',
      active_cue: null,
      next_cue: { id: 'c1', title: 'Opening' },
    })
  })

  test('ENDED runner → stopped, next_cue is null', () => {
    const runner = mkRunner({ timesnap: { cueId: null, running: false, kickoff: 0, lastStop: 0, deadline: 0 } })
    const status = buildStatus({ runner, cueById, cueOrder, serverTime: 999 })
    expect(status).toEqual({
      server_time: 999,
      state: 'stopped',
      active_cue: null,
      next_cue: null,
    })
  })

  test('running runner → paused_at null, duration_ms = deadline - kickoff', () => {
    const runner = mkRunner({
      timesnap: { cueId: 'c1', running: true, kickoff: 1000, lastStop: 1000, deadline: 61000 },
      nextCueId: 'c2',
    })
    const status = buildStatus({ runner, cueById, cueOrder, serverTime: 2000 })
    expect(status.state).toBe('running')
    expect(status.active_cue).toEqual({
      id: 'c1',
      title: 'Opening',
      started_at: 1000,
      paused_at: null,
      duration_ms: 60000,
    })
    expect(status.next_cue).toEqual({ id: 'c2', title: 'Guest intro' })
  })

  test('paused runner → paused_at = lastStop', () => {
    const runner = mkRunner({
      timesnap: { cueId: 'c1', running: false, kickoff: 1000, lastStop: 1500, deadline: 61000 },
      nextCueId: 'c2',
    })
    const status = buildStatus({ runner, cueById, cueOrder, serverTime: 2000 })
    expect(status.state).toBe('paused')
    expect(status.active_cue).toEqual({
      id: 'c1',
      title: 'Opening',
      started_at: 1000,
      paused_at: 1500,
      duration_ms: 60000,
    })
  })

  test('paused remaining math: started_at + duration_ms - paused_at', () => {
    const runner = mkRunner({
      timesnap: { cueId: 'c1', running: false, kickoff: 1000, lastStop: 1500, deadline: 61000 },
    })
    const status = buildStatus({ runner, cueById, cueOrder, serverTime: 9999 })
    const remaining = status.active_cue!.started_at + status.active_cue!.duration_ms - status.active_cue!.paused_at!
    expect(remaining).toBe(59500) // 1000 + 60000 - 1500
  })

  test('last cue → next_cue null', () => {
    const runner = mkRunner({
      timesnap: { cueId: 'c2', running: true, kickoff: 1000, lastStop: 1000, deadline: 2000 },
      nextCueId: null,
    })
    const status = buildStatus({ runner, cueById, cueOrder, serverTime: 1500 })
    expect(status.next_cue).toBe(null)
  })

  test('nextCueId pointing at a non-existent cue → next_cue null (defensive)', () => {
    const runner = mkRunner({
      timesnap: { cueId: 'c1', running: true, kickoff: 1000, lastStop: 1000, deadline: 2000 },
      nextCueId: 'cghost',
    })
    const status = buildStatus({ runner, cueById, cueOrder, serverTime: 1500 })
    expect(status.next_cue).toBe(null)
  })
})
