import type { Cue, RundownCue, RundownCueOrderItem } from '@rundown-studio/types'
import { buildParentGroupMap } from './buildParentGroupMap'

/**
 * Map of cue id → is this cue's PARENT GROUP skipped during the show?
 *
 * Reports the parent's contribution alone, deliberately leaving the cue's own
 * `skipDuringShow` out of it: a cue skipped because of its group is a different
 * fact from a cue skipped on its own, and callers that must tell the two apart
 * can't recover the distinction once they're OR-ed together. Fold them for the
 * effective answer:
 *
 *     const skipped = !!cue.settings?.skipDuringShow || parentSkipMap[cue.id]
 *
 * This is the missing input to `ApiV1Utils.toPublicCue`, which needs the split
 * to report `skipped_by: 'self' | 'group' | null` — hence a shared util rather
 * than a caller-local helper: the REST projection and the realtime SSE
 * projection must derive it identically or the same cue reads differently on
 * the two surfaces.
 *
 * Keyed for every cue in `cues`. `cues` must contain the parent groups of any
 * cue whose entry is to be meaningful; passing extra cues is fine, since
 * non-parents are never looked up. A parent named by `cueOrder` but absent from
 * `cues` — deleted mid-flight — reads as not-skipped.
 */
export function buildParentSkipMap(cueOrder: RundownCueOrderItem[], cues: Cue[]): Record<RundownCue['id'], boolean> {
  const parentGroupMap = buildParentGroupMap(cueOrder)
  const cueMap = new Map(cues.map((cue) => [cue.id, cue]))
  const parentSkipMap: Record<RundownCue['id'], boolean> = {}

  for (const cue of cues) {
    const parentId = parentGroupMap[cue.id]
    parentSkipMap[cue.id] = parentId ? !!cueMap.get(parentId)?.settings?.skipDuringShow : false
  }

  return parentSkipMap
}
