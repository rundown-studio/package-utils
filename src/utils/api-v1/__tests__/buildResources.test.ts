import {
  type Cell,
  type Column,
  CueType,
  type Rundown,
  type RundownCue,
  type RundownCueOrderItem,
} from '@rundown-studio/types'
import { describe, expect, test } from 'vitest'
import {
  publicColumnIdSet,
  toPublicCell,
  toPublicColumn,
  toPublicCue,
  toPublicOrderTree,
  toPublicRundownShallow,
  toPublicSettings,
} from '../buildResources'

const EPOCH = new Date('2026-06-17T10:00:00.000Z')
const EPOCH_MS = EPOCH.getTime()

describe('toPublicOrderTree', () => {
  test('omits children when empty/absent', () => {
    const tree: RundownCueOrderItem[] = [
      { id: 'cue_a' },
      { id: 'cue_b', children: [] },
      { id: 'cue_c', children: [{ id: 'cue_d' }] },
    ]
    expect(toPublicOrderTree(tree)).toEqual([
      { id: 'cue_a' },
      { id: 'cue_b' },
      { id: 'cue_c', children: [{ id: 'cue_d' }] },
    ])
  })

  test('projects children as leaf ids only — groups cannot nest', () => {
    const tree: RundownCueOrderItem[] = [{ id: 'g1', children: [{ id: 'g2', children: [{ id: 'leaf' }] }] }]
    expect(toPublicOrderTree(tree)).toEqual([{ id: 'g1', children: [{ id: 'g2' }] }])
  })
})

describe('toPublicSettings', () => {
  test('projects the deliberate public subset (cue_numbering + tod_display_format)', () => {
    expect(
      toPublicSettings({
        cueIndexStartFrom: 5,
        cueIndexPrefix: 'A',
        cueIndexPadding: 2,
        todDisplayFormat: '24h',
      } as Rundown['settings']),
    ).toEqual({
      cue_numbering: { start_from: 5, prefix: 'A', padding: 2 },
      tod_display_format: '24h',
    })
  })

  test('drops internal-only fields (palette, highlight, outputConfig, outputMessage)', () => {
    const out = toPublicSettings({
      cueIndexStartFrom: 1,
      cueIndexPrefix: '',
      cueIndexPadding: 1,
      outputConfig: 'overlay',
      outputMessage: { text: 'STAND BY', visible: true, color: '#fff', bold: true, underline: false },
      cueBackgroundColours: ['#000', '#fff'],
      currentCueHighlightColor: '#ef4444',
    } as Rundown['settings'])
    expect(Object.keys(out).sort()).toEqual(['cue_numbering', 'tod_display_format'])
  })

  test('defensive defaults when the whole settings object is missing (legacy doc)', () => {
    expect(toPublicSettings(undefined)).toEqual({
      cue_numbering: { start_from: 1, prefix: '', padding: 1 },
      tod_display_format: null,
    })
  })
})

/** A minimal cue — only the fields the projection reads, cast to the full type. */
function cue(overrides: Partial<RundownCue> = {}): RundownCue {
  return {
    id: 'cue_1',
    type: 'cue',
    title: 'Opening',
    subtitle: 'the top of show',
    duration: 60000,
    backgroundColor: '#ff0000',
    startTime: EPOCH,
    settings: {},
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  } as RundownCue
}

/** The common case — a root-level cue with no parent group. */
const NO_PARENT = { parentSkipped: false }

describe('toPublicCue', () => {
  test('projects a cue to the public wire shape', () => {
    expect(toPublicCue(cue(), NO_PARENT)).toEqual({
      id: 'cue_1',
      type: 'cue',
      title: 'Opening',
      subtitle: 'the top of show',
      duration_ms: 60000,
      background_color: '#ff0000',
      prevent_edits: false,
      skipped_by: null,
      start_time: EPOCH_MS,
      created_at: '2026-06-17T10:00:00.000Z',
      updated_at: '2026-06-17T10:00:00.000Z',
    })
  })

  test('start_time is null when the cue is unscheduled', () => {
    expect(toPublicCue(cue({ startTime: null }), NO_PARENT).start_time).toBeNull()
  })

  test('prevent_edits reads settings.preventEdits', () => {
    expect(toPublicCue(cue({ settings: { preventEdits: true } } as Partial<RundownCue>), NO_PARENT).prevent_edits).toBe(
      true,
    )
  })

  test('prevent_edits falls back to the legacy locked flag', () => {
    expect(toPublicCue(cue({ locked: true } as unknown as Partial<RundownCue>), NO_PARENT).prevent_edits).toBe(true)
  })

  test('passes heading / group types through', () => {
    expect(toPublicCue(cue({ type: CueType.HEADING }), NO_PARENT).type).toBe('heading')
    expect(toPublicCue(cue({ type: CueType.GROUP }), NO_PARENT).type).toBe('group')
  })
})

/** A cue with its own skip flag set either way. */
function skippingCue(skipDuringShow: boolean): RundownCue {
  return cue({ settings: { skipDuringShow } } as Partial<RundownCue>)
}

describe('toPublicCue — skipped_by', () => {
  test('null when neither the cue nor its group is skipped', () => {
    expect(toPublicCue(skippingCue(false), { parentSkipped: false }).skipped_by).toBeNull()
  })

  test("'self' when the cue's own flag is set", () => {
    expect(toPublicCue(skippingCue(true), { parentSkipped: false }).skipped_by).toBe('self')
  })

  test("'group' when only the parent group is skipped", () => {
    expect(toPublicCue(skippingCue(false), { parentSkipped: true }).skipped_by).toBe('group')
  })

  test("'self' wins when both apply — keeps the stored own flag recoverable", () => {
    expect(toPublicCue(skippingCue(true), { parentSkipped: true }).skipped_by).toBe('self')
  })

  test('null for a legacy cue with no settings object at all', () => {
    expect(toPublicCue(cue({ settings: undefined } as unknown as Partial<RundownCue>), NO_PARENT).skipped_by).toBeNull()
  })

  test('the two derivations consumers rely on', () => {
    const child = toPublicCue(skippingCue(false), { parentSkipped: true })
    // "will it run?" — the effective answer
    expect(child.skipped_by !== null).toBe(true)
    // "what is the stored own flag?" — recoverable, and false here
    expect(child.skipped_by === 'self').toBe(false)
  })
})

/** A minimal column, cast to the full type. */
function column(overrides: Partial<Column> = {}): Column {
  return {
    id: 'col_1',
    name: 'Notes',
    privateUid: null,
    deletedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  } as Column
}

describe('toPublicColumn', () => {
  test('projects a column to the public wire shape', () => {
    expect(toPublicColumn(column())).toEqual({
      id: 'col_1',
      name: 'Notes',
      created_at: '2026-06-17T10:00:00.000Z',
      updated_at: '2026-06-17T10:00:00.000Z',
    })
  })

  test('falls back to "Unnamed column" for a blank name', () => {
    expect(toPublicColumn(column({ name: '' })).name).toBe('Unnamed column')
  })
})

/** A minimal cell, cast to the full type. */
function cell(overrides: Partial<Cell> = {}): Cell {
  return {
    id: 'cell_1',
    cueId: 'cue_1',
    columnId: 'col_1',
    content: { text: '<p>Track <strong>01</strong></p>' },
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  } as Cell
}

describe('toPublicCell', () => {
  test('projects a richtext cell to the public wire shape', () => {
    expect(toPublicCell(cell(), column({ type: 'richtext' } as Partial<Column>))).toEqual({
      cue_id: 'cue_1',
      column_id: 'col_1',
      content: 'Track 01',
      content_html: '<p>Track <strong>01</strong></p>',
      created_at: '2026-06-17T10:00:00.000Z',
      updated_at: '2026-06-17T10:00:00.000Z',
    })
  })

  test('renders mentions from the write-time fallback (plaintext) and renames the tag up to the public vocabulary (html)', () => {
    const c = cell({
      content: { text: '<p>hi <custom-mention data-mention-id="m1" data-fallback-name="Bob"></custom-mention></p>' },
    } as Partial<Cell>)
    const out = toPublicCell(c, column({ type: 'richtext' } as Partial<Column>))
    expect(out.content).toBe('hi @Bob')
    // content_html renames the legacy storage tag to the public `rs-mention`.
    expect(out.content_html).toContain('<rs-mention')
    expect(out.content_html).not.toContain('custom-mention')
  })

  test('select column: content is the option label, content_html is empty', () => {
    const c = cell({ content: { selected: 'Option A' } } as Partial<Cell>)
    expect(toPublicCell(c, column({ type: 'select' } as Partial<Column>))).toMatchObject({
      content: 'Option A',
      content_html: '',
    })
  })

  test('null timestamps project to null', () => {
    const c = cell({ createdAt: null, updatedAt: null } as unknown as Partial<Cell>)
    const out = toPublicCell(c, column({ type: 'richtext' } as Partial<Column>))
    expect(out.created_at).toBeNull()
    expect(out.updated_at).toBeNull()
  })
})

describe('publicColumnIdSet', () => {
  test('keeps public, non-deleted columns', () => {
    const ids = publicColumnIdSet([column({ id: 'a' }), column({ id: 'b' })])
    expect([...ids].sort()).toEqual(['a', 'b'])
  })

  test('drops private columns (privateUid set)', () => {
    const ids = publicColumnIdSet([column({ id: 'a' }), column({ id: 'priv', privateUid: 'user_9' })])
    expect([...ids]).toEqual(['a'])
  })

  test('drops soft-deleted columns', () => {
    const ids = publicColumnIdSet([column({ id: 'a' }), column({ id: 'gone', deletedAt: EPOCH })])
    expect([...ids]).toEqual(['a'])
  })
})

/** A minimal rundown, cast to the full type. */
function rundown(overrides: Partial<Rundown> = {}): Rundown {
  return {
    id: 'rd_1',
    name: 'Morning Show',
    timezone: 'America/New_York',
    startTime: EPOCH,
    endTime: null,
    status: 'draft',
    settings: {},
    cues: [{ id: 'cue_1' }, { id: 'grp_1', children: [{ id: 'cue_2' }] }],
    columns: ['col_1', 'col_priv'],
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  } as Rundown
}

describe('toPublicRundownShallow', () => {
  const publicIds = new Set(['col_1'])

  test('projects a rundown to the public shallow wire shape', () => {
    expect(toPublicRundownShallow(rundown(), publicIds)).toEqual({
      id: 'rd_1',
      title: 'Morning Show',
      timezone: 'America/New_York',
      start_time: EPOCH_MS,
      end_time: null,
      status: 'draft',
      settings: {
        cue_numbering: { start_from: 1, prefix: '', padding: 1 },
        tod_display_format: null,
      },
      cue_order: [{ id: 'cue_1' }, { id: 'grp_1', children: [{ id: 'cue_2' }] }],
      column_order: ['col_1'],
      created_at: '2026-06-17T10:00:00.000Z',
      updated_at: '2026-06-17T10:00:00.000Z',
    })
  })

  test('column_order excludes ids not in the public set (no private leak)', () => {
    expect(toPublicRundownShallow(rundown(), publicIds).column_order).toEqual(['col_1'])
  })

  test('omitting the public set passes column_order through unfiltered', () => {
    expect(toPublicRundownShallow(rundown()).column_order).toEqual(['col_1', 'col_priv'])
  })

  test('surfaces configured cue-numbering + tod format', () => {
    const r = rundown({
      settings: {
        cueIndexStartFrom: 10,
        cueIndexPrefix: 'A',
        cueIndexPadding: 2,
        todDisplayFormat: '24h',
      },
    } as Partial<Rundown>)
    expect(toPublicRundownShallow(r, publicIds).settings).toEqual({
      cue_numbering: { start_from: 10, prefix: 'A', padding: 2 },
      tod_display_format: '24h',
    })
  })
})
