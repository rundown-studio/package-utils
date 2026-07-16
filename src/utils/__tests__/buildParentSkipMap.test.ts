import { type Cue, CueType, type RundownCueOrderItem } from '@rundown-studio/types'
import { describe, expect, test } from 'vitest'
import { buildParentSkipMap } from '../buildParentSkipMap'

// Shape-only factory — the map reads `id` and `settings.skipDuringShow` only.
function cue(id: string, skipDuringShow = false, type = CueType.CUE): Cue {
  return { id, type, settings: { skipDuringShow } } as Cue
}

function group(id: string, skipDuringShow: boolean): Cue {
  return cue(id, skipDuringShow, CueType.GROUP)
}

/** g1 (skipped) → [a], g2 (not skipped) → [b], plus root cue c. */
const ORDER: RundownCueOrderItem[] = [
  { id: 'g1', children: [{ id: 'a' }] },
  { id: 'g2', children: [{ id: 'b' }] },
  { id: 'c' },
]

const CUES = [group('g1', true), group('g2', false), cue('a'), cue('b'), cue('c')]

describe('buildParentSkipMap', () => {
  test('keyed for every cue passed in', () => {
    expect(Object.keys(buildParentSkipMap(ORDER, CUES)).sort()).toEqual(['a', 'b', 'c', 'g1', 'g2'])
  })

  test('true for a child of a skipped group', () => {
    expect(buildParentSkipMap(ORDER, CUES).a).toBe(true)
  })

  test('false for a child of a non-skipped group', () => {
    expect(buildParentSkipMap(ORDER, CUES).b).toBe(false)
  })

  test('false for a root-level cue — no parent to inherit from', () => {
    expect(buildParentSkipMap(ORDER, CUES).c).toBe(false)
  })

  test('false for the group itself — groups are root-level and cannot nest', () => {
    expect(buildParentSkipMap(ORDER, CUES).g1).toBe(false)
  })

  test("reports the parent's contribution alone, never the cue's own flag", () => {
    // Child's own flag is set, parent's is not. Callers OR the two together;
    // this map must not pre-empt that or 'self' and 'group' become inseparable.
    expect(buildParentSkipMap(ORDER, [group('g2', false), cue('b', true)]).b).toBe(false)
  })

  test('a parent absent from `cues` — deleted mid-flight — reads as not-skipped', () => {
    expect(buildParentSkipMap(ORDER, [cue('a'), cue('b')]).a).toBe(false)
  })

  test('a cue with no settings object reads as not-skipped', () => {
    const legacy = { id: 'g1', type: CueType.GROUP } as Cue
    expect(buildParentSkipMap(ORDER, [legacy, cue('a')]).a).toBe(false)
  })

  test('extra cues that parent nothing are harmless', () => {
    const map = buildParentSkipMap(ORDER, [...CUES, group('g_unrelated', true)])
    expect(map.a).toBe(true)
    expect(map.g_unrelated).toBe(false)
  })
})
