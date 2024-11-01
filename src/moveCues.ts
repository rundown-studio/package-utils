import { Rundown, RundownCueOrderItem } from '@rundown-studio/types'

/**
 * Moves selected cues to a new position within the rundown's cue order.
 * This function reorders the cues based on a specified destination index and
 * validates that group headers cannot be moved into another group.
 *
 * @async
 * @function
 * @param {RundownCueOrderItem[]} cueOrder - The original array representing the current order of cues.
 * @param {Array<Rundown['id']>} selectedCues - An array of IDs for the cues that should be moved.
 * @param {string} destination - A string representing the target position in the form "mainIndex.subIndex".
 *                                - `mainIndex` refers to the position of the cue or group in the main order.
 *                                - `subIndex` (optional) refers to the position within a group's children.
 *
 * @throws {Error} Throws an error if a group header is attempted to be moved inside another group.
 *
 * @return {Promise<RundownCueOrderItem[]>} - A promise that resolves to the new order of cues (`newCueOrder`)
 *                                            after the selected cues have been moved.
 *
 * @description
 * - Parses the destination to determine the main and sub-level positions.
 * - Removes the selected cues from their original positions and inserts them at the destination.
 * - Ensures that groups are not improperly nested within other groups.
 */
export async function moveCues (
  cueOrder: RundownCueOrderItem[],
  selectedCues: Array<Rundown['id']>,
  destination: string,
): Promise<RundownCueOrderItem[]> {
  const selectedItems = selectCueOrderItems(cueOrder, selectedCues)
  const parsedInput = destination.split('.').map(Number)
  const mainIndex = parsedInput[0]
  const subIndex = parsedInput[1]

  // Error handling: prevent adding a group into another group
  if (selectedItems.find((i) => i.children) && subIndex) {
    throw new Error('Cannot move a group header inside another group')
  }

  const newCueOrder: RundownCueOrderItem[] = []
  let idx = 0

  if (mainIndex == 0) {
    newCueOrder.push(...selectedItems)
  }

  for (const cueOrderItem of cueOrder) {
    idx++
    if (!cueOrderItem.children) {
      if (!selectedCues.includes(cueOrderItem.id)) {
        newCueOrder.push(cueOrderItem)
      }
      if (idx == mainIndex && subIndex == undefined) newCueOrder.push(...selectedItems)
    } else {
      const children = []
      let childIdx = 0
      if (idx == mainIndex && subIndex == 0) children.push(...selectedItems)
      for (const cueOrderItemChildren of cueOrderItem.children) {
        childIdx++
        if (!selectedCues.includes(cueOrderItemChildren.id)) {
          children.push(cueOrderItemChildren)
        }
        if (idx == mainIndex && childIdx == subIndex) children.push(...selectedItems)
      }
      if (mainIndex == idx && subIndex > childIdx) {
        children.push(...selectedItems)
      }
      if (!selectedCues.includes(cueOrderItem.id)) {
        newCueOrder.push({ id: cueOrderItem.id, children })
      }
      if (idx == mainIndex && subIndex == undefined) newCueOrder.push(...selectedItems)
    }
  }

  if (mainIndex > idx) {
    newCueOrder.push(...selectedItems)
  }

  return newCueOrder
}

/**
 * Selects and extracts cue order items based on their IDs, and determines if any of the selected items are groups.
 *
 * @function
 * @param {RundownCueOrderItem[]} cueOrder - The original array of cue order items.
 * @param {Array<Rundown['id']>} selectedCues - An array of IDs representing the cues to be selected.
 * @return {{ items: RundownCueOrderItem[], hasGroups: boolean }} - An object containing:
 *   - `items`: The selected cue items.
 *   - `hasGroups`: A boolean indicating whether any of the selected items are groups.
 */
function selectCueOrderItems (
  cueOrder: RundownCueOrderItem[],
  selectedCues: Array<Rundown['id']>,
): RundownCueOrderItem[] {
  const items: RundownCueOrderItem[] = []

  for (const cueOrderItem of cueOrder) {
    // If the current item is in the selectedCues list, add it to the items array
    if (selectedCues.includes(cueOrderItem.id)) {
      items.push(cueOrderItem)
      continue
    }

    // If the current item has no children, skip to the next item
    if (!cueOrderItem.children) continue

    for (const child of cueOrderItem.children) {
      // If the child is in the selectedCues list, add it to the items array
      if (selectedCues.includes(child.id)) {
        // If the current item has children, mark that there are groups
        items.push(child)
      }
    }
  }

  return items
}
