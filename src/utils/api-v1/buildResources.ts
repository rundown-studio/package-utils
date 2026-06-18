import type {
  ApiV1Cell,
  ApiV1Column,
  ApiV1Cue,
  ApiV1OrderItem,
  ApiV1RundownSettings,
  ApiV1RundownShallow,
  Cell,
  Column,
  Rundown,
  RundownCue,
  RundownCueOrderItem,
} from '@rundown-studio/types'
import { cellHtmlToPlainText } from '../cellHtmlToPlainText'
import { toPublicCellHtml } from './cellHtml'

/**
 * Internal → public projections for the v1 resource surface.
 *
 * One `toPublic*` family shared by both halves of the v1 API:
 *   - the Functions REST projections (`GET /rundowns/:id`, `…/cues/:id`,
 *     `…/columns/:id`, `…/cells`), whose `Public*` Zod schemas pin these wire
 *     shapes structurally (`_wireConformance`); and
 *   - the compute-engine realtime "fat" SSE event bodies (`cue`/`rundown`/
 *     `column`/`cell` at `:fat` fidelity).
 *
 * Two conversions happen here:
 *   1. **camelCase → snake_case** for every field name on the wire.
 *   2. **timestamp policy** — show-clock fields are epoch ms (`start_time`,
 *      `duration_ms`); lifecycle fields (`created_at`/`updated_at`) are ISO 8601.
 *
 * Pure projections of a single doc — no mentions/variables reads — so the SSE
 * push, the REST read, and the CSV export all flatten a cell identically.
 */

function toIso(d: Date | null | undefined): string | null {
  if (!d) return null
  return new Date(d).toISOString()
}

function toEpochMs(d: Date | null | undefined): number | null {
  if (!d) return null
  return new Date(d).getTime()
}

/**
 * Project the internal cue-order tree into the two-level `{ id, children? }`
 * wire shape. Groups cannot nest, so children are always leaves and project to
 * `{ id }` only; `children` is omitted (not just empty) when a node has none.
 * The internal type is recursive, but deeper nesting cannot exist — every write
 * path (dashboard, v1 create, v1 reorder) rejects nested groups.
 */
export function toPublicOrderTree(items: RundownCueOrderItem[]): ApiV1OrderItem[] {
  return items.map((item) => {
    if (item.children && item.children.length > 0) {
      return { id: item.id, children: item.children.map((child) => ({ id: child.id })) }
    }
    return { id: item.id }
  })
}

/**
 * Internal → public settings projection — the deliberate public subset, not a
 * mirror of internal storage. Editor-only display preferences, the reserved
 * `outputConfig` slot, and live `outputMessage` state are intentionally omitted.
 * Defensive defaults cover legacy rundowns that predate a numbering field.
 */
export function toPublicSettings(s: Rundown['settings'] | undefined): ApiV1RundownSettings {
  return {
    cue_numbering: {
      start_from: s?.cueIndexStartFrom ?? 1,
      prefix: s?.cueIndexPrefix ?? '',
      padding: s?.cueIndexPadding ?? 1,
    },
    tod_display_format: s?.todDisplayFormat ?? null,
  }
}

/**
 * Cue → `ApiV1Cue`. `prevent_edits` reads `cue.settings.preventEdits` — the
 * canonical field — falling back to the legacy `cue.locked` for cues that
 * predate the RSH-260 settings migration (the migration adds `settings` without
 * deleting `locked`). Read-side fallback only — no code path writes `locked`.
 * Per product convention the flag guards *cell* edits, not the cue's existence
 * or position — it surfaces here as a read-only signal.
 */
export function toPublicCue(cue: RundownCue): ApiV1Cue {
  return {
    id: cue.id,
    type: cue.type,
    title: cue.title,
    subtitle: cue.subtitle,
    duration_ms: cue.duration,
    background_color: cue.backgroundColor,
    prevent_edits: cue.settings?.preventEdits ?? (cue as { locked?: boolean }).locked ?? false,
    start_time: toEpochMs(cue.startTime),
    created_at: toIso(cue.createdAt),
    updated_at: toIso(cue.updatedAt),
  }
}

/**
 * Column → `ApiV1Column`. `name` falls back to `'Unnamed column'` for legacy
 * docs with a blank name. The caller filters private/soft-deleted columns before
 * emitting, so this only ever sees public columns.
 */
export function toPublicColumn(column: Column): ApiV1Column {
  return {
    id: column.id,
    name: column.name || 'Unnamed column',
    created_at: toIso(column.createdAt),
    updated_at: toIso(column.updatedAt),
  }
}

/**
 * Cell → `ApiV1Cell`. Internal storage differs by column type:
 *   - richtext → `{ text: '<html>' }`. `content` flattens to plain text with
 *     mentions/variables rendered from their write-time fallback strings (no
 *     live resolution — `cellHtmlToPlainText` is a pure function of the HTML);
 *     `content_html` is the stored HTML with the legacy node tags adapted up to
 *     the public vocabulary (`toPublicCellHtml`) — the lossless, round-trippable
 *     form that still carries the live mention-id/variable-key.
 *   - select   → `{ selected: '<option>' }` — the option label as `content`;
 *     `content_html` is empty (select cells carry no rich text).
 *   - others   → not exposed in v1 (filtered upstream).
 *
 * The caller filters to the public grid (visible cue + public column) before
 * emitting, so a private/orphan coordinate never reaches here.
 */
export function toPublicCell(cell: Cell, column: Column): ApiV1Cell {
  let content = ''
  let contentHtml = ''
  if (column.type === 'richtext') {
    const storedHtml = cell.content?.text || ''
    contentHtml = toPublicCellHtml(storedHtml)
    content = cellHtmlToPlainText(storedHtml)
  } else if (column.type === 'select') {
    content = cell.content?.selected || ''
  }
  return {
    cue_id: cell.cueId,
    column_id: cell.columnId,
    content,
    content_html: contentHtml,
    created_at: toIso(cell.createdAt),
    updated_at: toIso(cell.updatedAt),
  }
}

/**
 * Rundown → `ApiV1RundownShallow`. Top-level metadata + the cue-order tree as
 * IDs only; heavy content (cue/column/cell objects) ships separately.
 *
 * `publicColumnIds`: the raw `rundown.columns` order array contains PRIVATE
 * column ids too — any caller whose response actually exposes `column_order`
 * must pass the public-id set so private existence never leaks. Omit only when
 * the field is stripped downstream (list items) or every id is known public
 * (fresh create).
 */
export function toPublicRundownShallow(rundown: Rundown, publicColumnIds?: ReadonlySet<string>): ApiV1RundownShallow {
  return {
    id: rundown.id,
    title: rundown.name,
    timezone: rundown.timezone,
    start_time: toEpochMs(rundown.startTime),
    end_time: toEpochMs(rundown.endTime),
    status: rundown.status,
    settings: toPublicSettings(rundown.settings),
    cue_order: toPublicOrderTree(rundown.cues),
    column_order: publicColumnIds ? rundown.columns.filter((id) => publicColumnIds.has(id)) : rundown.columns,
    created_at: toIso(rundown.createdAt),
    updated_at: toIso(rundown.updatedAt),
  }
}

/**
 * Public column ids: drop private (`privateUid != null`) and soft-deleted
 * columns. The Set form a `toPublicRundownShallow` caller passes as `publicColumnIds`.
 */
export function publicColumnIdSet(columns: Iterable<Column>): Set<string> {
  const ids = new Set<string>()
  for (const c of columns) {
    if (c.privateUid == null && c.deletedAt == null) ids.add(c.id)
  }
  return ids
}
