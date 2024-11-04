import { Rundown, RundownCueOrderItem } from '@rundown-studio/types'

/**
 * Moves selected cues to a new position within the rundown's cue order.
 *
 * @async
 * @function
 * @param {RundownCueOrderItem[]} cueOrder - The original array of cue order items.
 * @param {Array<Rundown['id']>} selectedCues - IDs of the cues to move.
 * @param {string} destination - Target position formatted as "mainIndex.subIndex".
 * @throws {Error} If a group header is attempted to be moved inside another group.
 * @return {Promise<RundownCueOrderItem[]>} - The reordered cue array.
 */
export async function moveCues (
  cueOrder: RundownCueOrderItem[],
  selectedCues: Array<Rundown['id']>,
  destination: string,
): Promise<RundownCueOrderItem[]> {
  const selectedCueIds = new Set(selectedCues)
  const selectedItems = selectCueItems(cueOrder, selectedCueIds)
  const [mainIndex, subIndex] = destination.split('.').map(Number)

  // Prevent moving a group header into another group
  if (selectedItems.some((item) => item.children) && subIndex !== undefined) {
    throw new Error('Cannot move a group header inside another group')
  }

  const newCueOrder: RundownCueOrderItem[] = []
  let currentIndex = 0

  if (mainIndex === 0) newCueOrder.push(...selectedItems)

  for (const item of cueOrder) {
    currentIndex++

    if (!item.children) {
      if (!selectedCueIds.has(item.id)) newCueOrder.push(item)
      if (currentIndex === mainIndex && subIndex === undefined) {
        newCueOrder.push(...selectedItems)
      }
    } else {
      const children = []
      let childIndex = 0

      if (currentIndex === mainIndex && subIndex === 0) {
        children.push(...selectedItems)
      }

      for (const child of item.children) {
        childIndex++
        if (!selectedCueIds.has(child.id)) children.push(child)
        if (currentIndex === mainIndex && childIndex === subIndex) {
          children.push(...selectedItems)
        }
      }

      if (mainIndex === currentIndex && subIndex > childIndex) {
        children.push(...selectedItems)
      }

      if (!selectedCueIds.has(item.id)) {
        newCueOrder.push({ id: item.id, children })
      }

      if (currentIndex === mainIndex && subIndex === undefined) {
        newCueOrder.push(...selectedItems)
      }
    }
  }

  if (mainIndex > currentIndex) newCueOrder.push(...selectedItems)

  return newCueOrder
}

/**
 * Selects cue order items based on their IDs.
 *
 * @function
 * @param {RundownCueOrderItem[]} cueOrder - The original array of cue order items.
 * @param {Set<Rundown['id']>} selectedCues - IDs of the cues to select.
 * @return {RundownCueOrderItem[]} - The selected cue items.
 */
function selectCueItems (
  cueOrder: RundownCueOrderItem[],
  selectedCues: Set<Rundown['id']>,
): RundownCueOrderItem[] {
  return cueOrder.flatMap((item) => {
    if (selectedCues.has(item.id)) return [item]
    if (!item.children) return []
    return item.children.filter((child) => selectedCues.has(child.id))
  })
}
