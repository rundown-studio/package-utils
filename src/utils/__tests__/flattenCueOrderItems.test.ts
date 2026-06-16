import { expect, test, describe } from 'vitest'
import type { RundownCueOrderItem } from '@rundown-studio/types'
import { flattenCueOrderItems } from '../flattenCueOrderItems'

describe('flattenCueOrderItems', () => {
  test('flat list — ids in order', () => {
    const order: RundownCueOrderItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(flattenCueOrderItems(order)).toEqual(['a', 'b', 'c'])
  })

  test('descends into children, parent before its children', () => {
    const order: RundownCueOrderItem[] = [
      { id: 'g1', children: [{ id: 'c1' }, { id: 'c2' }] },
      { id: 'c3' },
    ]
    expect(flattenCueOrderItems(order)).toEqual(['g1', 'c1', 'c2', 'c3'])
  })

  test('empty order → empty list', () => {
    expect(flattenCueOrderItems([])).toEqual([])
  })
})
