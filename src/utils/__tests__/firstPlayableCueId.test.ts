import { expect, test, describe } from 'vitest'
import { CueType, type RundownCue, type RundownCueOrderItem } from '@rundown-studio/types'
import { firstPlayableCueId } from '../firstPlayableCueId'

const cueRow = (id: string, type: CueType, title: string): Pick<RundownCue, 'id' | 'type' | 'title'> => ({
  id, type, title,
})

describe('firstPlayableCueId', () => {
  const map = new Map([
    ['h1', cueRow('h1', CueType.HEADING, 'Section')],
    ['g1', cueRow('g1', CueType.GROUP, 'Group')],
    ['c1', cueRow('c1', CueType.CUE, 'First cue')],
    ['c2', cueRow('c2', CueType.CUE, 'Second cue')],
  ])

  test('skips headings and groups, returns first cue', () => {
    const order: RundownCueOrderItem[] = [
      { id: 'h1' },
      { id: 'g1' },
      { id: 'c1' },
      { id: 'c2' },
    ]
    expect(firstPlayableCueId(order, map)).toBe('c1')
  })

  test('descends into group children', () => {
    const order: RundownCueOrderItem[] = [
      { id: 'h1' },
      { id: 'g1', children: [{ id: 'c1' }] },
    ]
    expect(firstPlayableCueId(order, map)).toBe('c1')
  })

  test('returns null when no playable cues exist', () => {
    const order: RundownCueOrderItem[] = [{ id: 'h1' }, { id: 'g1' }]
    expect(firstPlayableCueId(order, map)).toBe(null)
  })

  test('returns null on empty order', () => {
    expect(firstPlayableCueId([], map)).toBe(null)
  })
})
