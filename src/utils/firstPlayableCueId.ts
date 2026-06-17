import type { RundownCue, RundownCueOrderItem } from '@rundown-studio/types'
import { CueType } from '@rundown-studio/types'
import { flattenCueOrderItems } from './flattenCueOrderItems'

/** The slice of a cue the status projection needs (id/type/title). */
export type CueLite = Pick<RundownCue, 'id' | 'type' | 'title'>

/**
 * Walk the cue-order tree and return the first `cue`-typed entry — used to
 * populate `next_cue` in the pre-show state. Returns null on an empty rundown
 * or one that has only headings/groups.
 */
export function firstPlayableCueId(cueOrder: RundownCueOrderItem[], cueById: Map<string, CueLite>): string | null {
  for (const id of flattenCueOrderItems(cueOrder)) {
    const c = cueById.get(id)
    if (c && c.type === CueType.CUE) return id
  }
  return null
}
