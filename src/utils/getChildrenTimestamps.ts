import { RundownCueOrderItem, DocumentSnapshotId } from '@rundown-studio/types'
import { Timestamps, Timestamp } from './createTimestamps'

/**
 * Retrieves the timestamps of children cues associated with a given parent cue ID.
 *
 * @param {DocumentSnapshotId} parentCueId - The ID of the parent cue for which child timestamps are being retrieved.
 * @param {Timestamps} timestamps - An object containing cue timestamps.
 * @param {RundownCueOrderItem[]} cueOrder - An array representing the ordered list of cues, including child cues.
 * @return {Timestamp[]} An array of timestamps corresponding to the children of the specified parent cue.
 */
export function getChildrenTimestamps (
  parentCueId: DocumentSnapshotId,
  timestamps: Timestamps,
  cueOrder: RundownCueOrderItem[],
): Timestamp[] {
  const childrenTimestamps: Timestamp[] = []

  for (const { id, children } of cueOrder) {
    if (id !== parentCueId) continue

    children?.forEach((child) => {
      childrenTimestamps.push(timestamps.cues[child.id])
    })
  }

  return childrenTimestamps
}
