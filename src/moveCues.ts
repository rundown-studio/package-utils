import { Rundown, RundownCueOrderItem } from '@rundown-studio/types'

/**
 * Moves selected cues to a new position within the rundown's cues order.
 * This function reorders the cues based on a given destination string and validates
 * that group headers cannot be nested within other groups.
 *
 * @async
 * @function
 * @param {RundownCueOrderItem[]} cueOrder - Original cue order, representing actual position of each cue.
 * @param {Array<string>} selectedCues - Array of IDs for the cues to be moved.
 * @param {string} destination - A string representing the target index position in the form "\d+\.?\d*"
 *                               (e.g., "4" for a main level position or "4.2" for a position within a group).
 *
 * @throws {Error} Will throw an error if a group header is moved into another group, as nested groups are not allowed.
 *
 * @return {Promise<RundownCueOrderItem[]>} - A promise that resolves to the new order of cues (`newCuesOrder`)
 *                                             after the selected cues have been moved.
 *
 * @description
 * This function:
 * - Retrieves the rundown cues order from the service.
 * - Identifies and collects the selected cues and their current positions within the rundown.
 * - Validates the destination for group header movements to prevent nested groups.
 * - Removes selected cues from their original positions.
 * - Inserts the selected cues into the specified position based on `destination`.
 *
 * @example
 * // Moves selected cues to position after index 4.2
 * await moveCues('rundown123', ['cueId1', 'cueId2'], '4.2')
 */
export async function moveCues (
  cueOrder: RundownCueOrderItem[],
  selectedCues: Array<Rundown['id']>,
  destination: string,
): Promise<RundownCueOrderItem[]> {
  const newCuesOrder = [...cueOrder]
  const parsedInput = destination.split('.').map(Number) // e.g., '4.2' becomes [4, 2]
  const mainIndex = parsedInput[0] - 1 // Adjust to 0-based index
  const subIndex = parsedInput[1] !== undefined ? parsedInput[1] - 1 : null

  const selectedCueIds = new Set(selectedCues)
  const selectedItems = []

  // Flatten cuesOrder for easier manipulation
  for (const [i, cue] of newCuesOrder.entries()) {
    if (selectedCueIds.has(cue.id)) {
      selectedItems.push({ item: cue, index: i })
      continue
    }
    if (cue.children) {
      const childrenToRemove: Array<number> = []
      for (const [j, child] of cue.children.entries()) {
        if (selectedCueIds.has(child.id)) {
          selectedItems.push({ item: child, groupIndex: i, childIndex: j })
          childrenToRemove.push(j)
        }
      }
      cue.children = cue.children.filter((_, idx) => !childrenToRemove.includes(idx))
    }
  }

  if (selectedItems.some(({ item }) => item.children) && subIndex !== null) {
    throw new Error('Cannot move a group header inside another group')
  }

  for (const { index, groupIndex, childIndex } of selectedItems.reverse()) {
    if (index !== undefined) {
      newCuesOrder.splice(index, 1)
    } else if (groupIndex !== undefined && childIndex !== undefined) {
      newCuesOrder[groupIndex].children?.splice(childIndex, 1)
    }
  }

  if (subIndex !== null) {
    newCuesOrder[mainIndex].children?.splice(subIndex + 1, 0, ...selectedItems.map(({ item }) => item))
  } else {
    newCuesOrder.splice(mainIndex + 1, 0, ...selectedItems.map(({ item }) => item))
  }

  return newCuesOrder
}
