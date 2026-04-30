import { DocumentSnapshot, DocumentSnapshotId } from '@rundown-studio/types'
import _ from 'lodash'

export type ParsedDocument = {
  id?: DocumentSnapshotId
  [key: string]: any
  createdAt?: Date
  updatedAt?: Date
}

export type parseSnapshotOptions = {
  defaults?: Record<string, any>
  overwrite?: Record<string, any>
  pick?: string[]
  dateKeys?: string[]
}

/**
 * Parse a firebase DocumentSnapshot to object with id, values and timestamp
 * @param {DocumentSnapshot} snapshot
 * @param {Record<string, any>} options.defaults
 * @param {Record<string, any>} options.overwrite
 * @param {string[]} options.pick
 * @param {string[]} options.dateKeys
 * @return {ParsedDocument}
 */
export function parseSnapshot (
  snapshot: DocumentSnapshot,
  {
    defaults = {},
    overwrite = {},
    pick = [],
    dateKeys = [],
  }: parseSnapshotOptions = {},
): ParsedDocument {
  const data = snapshot.data() || {}
  for (const key of dateKeys) {
    data[key] = data?.[key]?.toDate?.() || _parseDate(data?.[key]) || data?.[key]
    if (data[key] === undefined) data[key] = defaults?.[key]
  }
  // Prefer explicit `createdAt` / `updatedAt` fields on the document over the
  // snapshot's metadata. The web Firestore SDK does not expose `createTime` /
  // `updateTime` on snapshots, so reading from the field is the only way to
  // get these timestamps client-side. Falls back to snapshot metadata for
  // backwards compatibility with documents that don't carry the field.
  const parsed: ParsedDocument = {
    ...defaults,
    id: snapshot.id,
    ...data,
    ...overwrite,
    createdAt: data?.createdAt?.toDate?.() ?? _parseDate(data?.createdAt) ?? snapshot.createTime?.toDate(),
    updatedAt: data?.updatedAt?.toDate?.() ?? _parseDate(data?.updatedAt) ?? snapshot.updateTime?.toDate(),
  }
  return pick.length ? _.pick(parsed, pick) : parsed
}

/**
 * _parseDate
 * @param {any} date
 * @return {Date | undefined}
 */
function _parseDate (date: any): Date | undefined {
  if (!date) return undefined
  const parsed = new Date(date)
  if (_isValidDate(parsed)) return parsed
  return undefined
}

/**
 * _isValidDate
 * @param {any} date
 * @return {boolean}
 */
function _isValidDate (date: any): boolean {
  return date instanceof Date && !isNaN(date?.getTime())
}
