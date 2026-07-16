import type { RundownCueOrderItem } from '@rundown-studio/types'
import { describe, expect, test } from 'vitest'
import { buildParentGroupMap } from '../buildParentGroupMap'

describe('buildParentGroupMap', () => {
  test('maps each child to its group', () => {
    const order: RundownCueOrderItem[] = [{ id: 'g1', children: [{ id: 'a' }, { id: 'b' }] }, { id: 'c' }]
    expect(buildParentGroupMap(order)).toEqual({ a: 'g1', b: 'g1' })
  })

  test('root-level cues are absent, not mapped to a sentinel', () => {
    const order: RundownCueOrderItem[] = [{ id: 'g1', children: [{ id: 'a' }] }, { id: 'c' }]
    const map = buildParentGroupMap(order)
    expect('c' in map).toBe(false)
    expect(map.c).toBeUndefined()
  })

  test('a group is not its own parent — groups are root-level and cannot nest', () => {
    const order: RundownCueOrderItem[] = [{ id: 'g1', children: [{ id: 'a' }] }]
    expect(buildParentGroupMap(order).g1).toBeUndefined()
  })

  test('an empty group contributes nothing', () => {
    expect(buildParentGroupMap([{ id: 'g1', children: [] }, { id: 'a' }])).toEqual({})
  })

  test('separate groups keep their own children', () => {
    const order: RundownCueOrderItem[] = [
      { id: 'g1', children: [{ id: 'a' }] },
      { id: 'g2', children: [{ id: 'b' }] },
    ]
    expect(buildParentGroupMap(order)).toEqual({ a: 'g1', b: 'g2' })
  })

  test('empty order → empty map', () => {
    expect(buildParentGroupMap([])).toEqual({})
  })
})
