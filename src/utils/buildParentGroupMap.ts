import type { RundownCue, RundownCueOrderItem } from '@rundown-studio/types'

/**
 * Map of child cue id → parent group id, read off the cue-order tree.
 *
 * Groups are root-level and their children are always leaves, so a cue has
 * either exactly one parent or none — no recursion, no transitive walk. This is
 * the primitive behind every group-level setting a child inherits (today:
 * `skipDuringShow` — see `buildParentSkipMap`).
 *
 * Root-level cues are absent from the map rather than mapped to a sentinel, so
 * a plain truthiness check answers "does this cue have a parent?".
 */
export function buildParentGroupMap(cueOrder: RundownCueOrderItem[]): Record<RundownCue['id'], RundownCue['id']> {
  const parentGroupMap: Record<RundownCue['id'], RundownCue['id']> = {}
  for (const item of cueOrder) {
    if (!item.children) continue
    for (const child of item.children) {
      parentGroupMap[child.id] = item.id
    }
  }
  return parentGroupMap
}
