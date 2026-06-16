import type { RundownCueOrderItem, RundownCue } from '@rundown-studio/types'

/**
 * Flatten a (possibly nested) cue-order tree into a flat list of cue ids, in
 * document order, descending into group children.
 */
export function flattenCueOrderItems (
  items: RundownCueOrderItem[],
): RundownCue['id'][] {
  return items.reduce<RundownCue['id'][]>((acc, item) => {
    acc.push(item.id)
    if (item.children) acc.push(...flattenCueOrderItems(item.children))
    return acc
  }, [])
}
