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

  // If the destination is the very beginning of the rundown, insert the selected items first
  if (mainIndex === 0) newCueOrder.push(...selectedItems)

  for (const item of cueOrder) {
    currentIndex++

    // If the item has no children (it's a single cue)
    if (!item.children) {
      // Add the item to the new order if it hasn't been selected for moving
      if (!selectedCueIds.has(item.id)) newCueOrder.push(item)

      // Edge case of wrong input, adding a subIndex in a normal cue number
      // Instead of removing the cue, it will be added after
      if (currentIndex == mainIndex && subIndex !== undefined) {
        newCueOrder.push(...selectedItems)
      }
    } else {
      // The item has children (it's a group)
      const children = []
      let childIndex = 0

      // If the destination is the beginning of this group, insert selected items
      if (currentIndex === mainIndex && subIndex === 0) {
        children.push(...selectedItems)
      }

      // Iterate through each child of the group
      for (const child of item.children) {
        childIndex++

        // Add the child to the group if it hasn't been selected for moving
        if (!selectedCueIds.has(child.id)) children.push(child)

        // If the current and child indices match the destination, insert selected items
        if (currentIndex === mainIndex && childIndex === subIndex) {
          children.push(...selectedItems)
        }
      }

      // If the subIndex is greater than the last child's index, insert selected items at the end
      if (mainIndex === currentIndex && subIndex > childIndex) {
        children.push(...selectedItems)
      }

      // Add the group to the new order if it hasn't been selected for moving
      if (!selectedCueIds.has(item.id)) {
        newCueOrder.push({ id: item.id, children })
      }
    }

    // If the current index matches the mainIndex and there's no subIndex,
    // insert the selected items
    if (currentIndex === mainIndex && subIndex === undefined) {
      newCueOrder.push(...selectedItems)
    }
  }

  // If the destination index is beyond the last item, append the selected items at the end
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
