import { RundownCue, RundownCueOrderItem, Runner, CueStartMode, CueType } from '@rundown-studio/types'
import { moveAfterWithTolerance, applyDate, getStartOfDay } from '@rundown-studio/timeutils'
import { CUE_OVERLAP_TOLERANCE } from '@rundown-studio/consts'
import _isEmpty from 'lodash/isEmpty'

export enum CueRunState {
  CUE_PAST = 'CUE_PAST',
  CUE_ACTIVE = 'CUE_ACTIVE',
  CUE_NEXT = 'CUE_NEXT',
  CUE_FUTURE = 'CUE_FUTURE',
}

export enum GroupRunState {
  GROUP_PAST = 'GROUP_PAST',
  GROUP_ACTIVE = 'GROUP_ACTIVE',
  GROUP_FUTURE = 'GROUP_FUTURE',
}

/**
 * Glossary:
 * original - are the values as they were when the rundown was started, a "snapshot" of the moment in time
 * actual - is a record of what actually happened and the projected changes thereof
 */

export interface StartDuration {
  start: Date
  duration: number
}

export interface Timestamp {
  id: RundownCue['id']
  index: number // The index of the cue in the original cues array
  state: CueRunState | GroupRunState
  original: StartDuration
  actual: StartDuration
}

export interface Timestamps {
  original: StartDuration
  actual: StartDuration
  cues: Record<RundownCue['id'], Timestamp>
}

/**
 * Create timestamps from rundown and runner data
 *
 * @param  {RundownCue[]} cues
 * @param  {RundownCueOrderItem[]} cueOrder
 * @param  {Runner | null} runner
 * @param  {Date} startTime - The rundown start time
 * @param  {string} [options.timezone = 'UTC']
 * @param  {Date} [options.now = new Date()]
 * @return {Timestamps}
 */
export function createTimestamps (
  cues: RundownCue[],
  cueOrder: RundownCueOrderItem[],
  runner: Runner | null,
  startTime: Date,
  {
    timezone = 'UTC',
    now = new Date(),
  }: {
    timezone?: string
    now?: Date
  } = {},
): Timestamps {
  if (!(now instanceof Date)) throw new Error('`now` must be an instance of Date')

  // Remember the original cue index
  const cueIndexMap: Record<RundownCue['id'], number> = Object.fromEntries(
    cues.map((cue, index): [RundownCue['id'], number] => [cue.id, index]),
  )

  // Create a list of cues (type=CueType.CUE) in order, ignoring groups
  const sortedCues = getSortedCues(cues, cueOrder)
  const sortedCueIds = sortedCues.map((c) => c.id)

  // Buid the actual timestamps from runner.timesnap, runner.elapsedCues & cues
  let actualStartDurations: Record<RundownCue['id'], StartDuration> = {}
  if (runner) {
    actualStartDurations = createActualStartDurations(sortedCues, runner, { timezone, now })
  }

  // Build the original timestamps from runner.originalCues & cues, or copy ideal if runner=null
  const actualStart: Date | undefined = actualStartDurations?.[sortedCues[0].id]?.start
  const firstDay = actualStart || now
  const originalStartDurations = createOriginalStartDurations(startTime, sortedCues, runner, { timezone, firstDay })
  if (_isEmpty(actualStartDurations)) actualStartDurations = originalStartDurations

  // Aggregate global start & duration for these three categories
  const originalTotal = calculateTotalStartDuration(originalStartDurations)
  const actualTotal = calculateTotalStartDuration(actualStartDurations)

  return {
    original: originalTotal,
    actual: actualTotal,
    cues: Object.fromEntries(
      sortedCues.map((cue): [Timestamp['id'], Timestamp] => [
        cue.id,
        {
          id: cue.id,
          index: cueIndexMap[cue.id],
          state: determineCueState(cue.id, runner, sortedCueIds),
          original: originalStartDurations[cue.id],
          actual: actualStartDurations[cue.id],
        },
      ]),
    ),
  }
}

/**
 * Creates a sorted, flat list of cues from a hierarchical cue order structure.
 *
 * @param cues - An array of all RundownCue objects.
 * @param cueOrder - A hierarchical structure representing the order of cues, potentially including groups.
 * @returns A flat array of RundownCue objects, sorted according to the cueOrder and containing only cues of type CueType.CUE.
 *
 * @description
 * This function traverses the hierarchical cueOrder structure and creates a flat list of cues.
 * It only includes cues of type CueType.CUE, ignoring HEADING and GROUP types.
 * The resulting array maintains the order specified in the cueOrder structure, including nested orders within groups.
 */
export function getSortedCues (
  cues: RundownCue[],
  cueOrder: RundownCueOrderItem[],
): RundownCue[] {
  const cueMap = new Map(cues.map((cue) => [cue.id, cue]))
  const sortedCues: RundownCue[] = []

  function traverse (items: RundownCueOrderItem[]) {
    for (const item of items) {
      const cue = cueMap.get(item.id)
      if (cue && cue.type === CueType.CUE) {
        sortedCues.push(cue)
      }
      if (item.children) {
        traverse(item.children)
      }
    }
  }

  traverse(cueOrder)
  return sortedCues
}

/**
 * Calculate the total duration of a list of cues.
 * @param items - An array of RundownCue or RunnerCue objects.
 * @returns The start time and total duration in milliseconds.
 */
function calculateTotalStartDuration (
  items: Record<RundownCue['id'], StartDuration>,
): StartDuration {
  const sdArray = Object.values(items)
  const firstSD = sdArray[0]
  const lastSD = sdArray[sdArray.length - 1]
  return {
    start: firstSD.start,
    duration: (lastSD.start.getTime() + lastSD.duration) - firstSD.start.getTime(),
  }
}

/**
 * Creates a map of original start times and durations for a list of cues.
 *
 * @param cues - An array of RundownCue objects representing the cues in the rundown.
 * @param runner - A Runner object or null, containing original cue information if available.
 * @returns A record mapping cue IDs to their original StartDuration objects.
 *
 * @description
 * This function generates a map of original start times and durations for each cue in the rundown.
 * It takes into account both the runner's original cue information (if available) and the cue's
 * own properties.
 */
function createOriginalStartDurations (
  startTime: Date,
  cues: RundownCue[],
  runner: Runner | null,
  {
    timezone,
    firstDay,
  }: {
    timezone: string
    firstDay: Date
  },
): Record<RundownCue['id'], StartDuration> {
  if (!cues.length) return {}

  const sdMap: Record<RundownCue['id'], StartDuration> = {}
  const startOfFirstDay = getStartOfDay(firstDay, { timezone })
  let previousEnd: Date = applyDate(startTime, startOfFirstDay, { timezone })

  cues.forEach((cue) => {
    const originalCue = runner?.originalCues[cue.id]

    // Assemble item
    let item: StartDuration
    if (originalCue) {
      const lockedStart = originalCue.startMode === CueStartMode.FIXED && originalCue.startTime
        ? new Date(originalCue.startTime)
        : null
      item = {
        start: lockedStart || previousEnd,
        duration: originalCue.duration,
      }
    } else {
      const lockedStart = cue.startMode === CueStartMode.FIXED ? cue.startTime : null
      item = {
        start: lockedStart || previousEnd,
        duration: cue.duration,
      }
    }

    // Make sure all cues are consecutive
    if (item.start < previousEnd) {
      item.start = moveAfterWithTolerance(item.start, previousEnd, CUE_OVERLAP_TOLERANCE, { timezone })
    }

    previousEnd = new Date(item.start.getTime() + item.duration)
    sdMap[cue.id] = item
  })

  return sdMap
}

/**
 * Create actual StartDuration records for each cue, representing what actually happened and the projected changes thereof.
 * @param cues - An array of RundownCue objects.
 * @param runner - The Runner object, if available.
 * @param now - The current time.
 * @param idealStartDurations - The ideal StartDuration records.
 * @returns A record of actual StartDuration objects, keyed by cue ID.
 */
function createActualStartDurations (
  cues: RundownCue[],
  runner: Runner,
  {
    timezone,
    now,
  }: {
    timezone: string
    now: Date
  },
): Record<RundownCue['id'], StartDuration> {
  if (!cues.length) return {}

  const sdMap: Record<RundownCue['id'], StartDuration> = {}
  const sortedCueIds = cues.map((c) => c.id)
  let previousEnd: Date

  cues.forEach((cue) => {
    const elapsedCue = runner.elapsedCues[cue.id]
    const isCurrent = runner.timesnap.cueId === cue.id
    const isPast = runner.timesnap.cueId === null || sortedCueIds.indexOf(cue.id) < sortedCueIds.indexOf(runner.timesnap.cueId || '')

    let item: StartDuration
    if (elapsedCue) {
      item = {
        start: new Date(elapsedCue.startTime),
        duration: elapsedCue.duration,
      }
    } else if (isCurrent) {
      item = {
        start: new Date(runner.timesnap.kickoff),
        duration: Math.max(now.getTime(), runner.timesnap.deadline) - runner.timesnap.kickoff,
      }
    } else if (isPast) {
      item = {
        start: previousEnd || new Date(runner.timesnap.kickoff),
        duration: 0,
      }
    } else {
      const lockedStart = cue.startMode === CueStartMode.FIXED ? cue.startTime : null
      item = {
        start: lockedStart || previousEnd,
        duration: cue.duration,
      }
    }

    // Make sure all cues are consecutive
    if (item.start < previousEnd) {
      item.start = moveAfterWithTolerance(item.start, previousEnd, CUE_OVERLAP_TOLERANCE, { timezone })
    }

    if (item.start) previousEnd = new Date(item.start.getTime() + item.duration)
    sdMap[cue.id] = item
  })

  return sdMap
}

/**
 * Determine the state of a cue based on the runner.
 * @param cueId - The ID of the cue in question.
 * @param runner - The Runner object, if available.
 * @param sortedCueIds - List of sorted cue ids.
 * @returns The CueRunState of the cue.
 */
function determineCueState (
  cueId: RundownCue['id'],
  runner: Runner | null,
  sortedCueIds: RundownCue['id'][],
): CueRunState {
  if (!runner) return CueRunState.CUE_FUTURE
  if (runner.timesnap.cueId === null) return CueRunState.CUE_PAST

  const isPast = sortedCueIds.indexOf(cueId) < sortedCueIds.indexOf(runner.timesnap.cueId || '')
  const isActive = runner.timesnap.cueId === cueId
  const isNext = runner.nextCueId === cueId

  if (isNext) return CueRunState.CUE_NEXT
  if (isPast) return CueRunState.CUE_PAST
  if (isActive) return CueRunState.CUE_ACTIVE
  return CueRunState.CUE_FUTURE
}
