import { RundownCue, RundownCueOrderItem, Runner, CueStartMode, CueType, RunnerState } from '@rundown-studio/types'
import { applyDate, getStartOfDay, addDays } from '@rundown-studio/timeutils'
import _isEmpty from 'lodash/isEmpty'
import { differenceInCalendarDays } from 'date-fns'
import { tz } from '@date-fns/tz'
import { getRunnerState } from './getRunnerState'

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
  daysPlus: number // Difference in days to the event start
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
  if (!cues.length) throw new Error('Cannot create timestamps for empty cues array')

  const runnerState = getRunnerState(runner)

  // Remember the original cue index
  const cueIndexMap: Record<RundownCue['id'], number> = Object.fromEntries(
    cues.map((cue, index): [RundownCue['id'], number] => [cue.id, index]),
  )

  // Create a list of cues (type=CueType.CUE) in order, ignoring groups
  const sortedCues = getSortedCues(cues, cueOrder)
  const sortedCueIds = sortedCues.map((c) => c.id)

  // Determine the actual start time and day based on runner state
  let actualShowStart: Date
  if (runnerState === RunnerState.PRESHOW) {
    actualShowStart = startTime
  } else {
    // Try to get the start from the first elapsed cue
    const firstElapsedStart = runner?.elapsedCues[sortedCues[0].id]?.startTime
    if (firstElapsedStart) {
      actualShowStart = new Date(firstElapsedStart)
    } else {
      // Fall back to kickoff time or now
      actualShowStart = runner ? new Date(runner.timesnap.kickoff) : now
    }
  }

  // Derive the original start from the actual day, but keep the intended time
  const originalShowStart: Date = applyDate(startTime, actualShowStart, { timezone })

  // Build the original timestamps
  const originalStartDurations = createOriginalStartDurations(sortedCues, runner, { timezone, showStart: originalShowStart })

  // Build the actual timestamps
  let actualStartDurations: Record<RundownCue['id'], StartDuration>
  if (runnerState === RunnerState.PRESHOW) {
    // During preshow, actual matches original
    actualStartDurations = originalStartDurations
  } else {
    // During show and after, calculate actual durations from runner data
    actualStartDurations = createActualStartDurations(sortedCues, runner!, { timezone, now, showStart: actualShowStart })
  }

  // Aggregate global start & duration
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
          state: determineCueRunState(cue.id, runner, sortedCueIds),
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
  if (_isEmpty(items)) throw new Error('Cannot calculate duration for empty items')
  const sdArray = Object.values(items)
  const firstSD = sdArray[0]
  const lastSD = sdArray[sdArray.length - 1]
  return {
    start: firstSD.start,
    duration: (lastSD.start.getTime() + lastSD.duration) - firstSD.start.getTime(),
    daysPlus: 0, // Always 0 for rundown total
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
  cues: RundownCue[],
  runner: Runner | null,
  {
    timezone,
    showStart,
  }: {
    timezone: string
    showStart: Date
  },
): Record<RundownCue['id'], StartDuration> {
  if (!cues.length) return {}

  const sdMap: Record<RundownCue['id'], StartDuration> = {}
  const startOfFirstDay = getStartOfDay(showStart, { timezone })
  let previousEnd = new Date(showStart)

  cues.forEach((cue) => {
    const originalCue = runner?.originalCues[cue.id]
    const daysToAdd = cue.startDatePlus || 0

    const adjustedStartTime = cue.startTime && applyDate(cue.startTime, addDays(startOfFirstDay, daysToAdd, { timezone }), { timezone })
    const hardStart = cue.startMode === CueStartMode.FIXED ? (adjustedStartTime ?? null) : null
    const start: Date = hardStart || previousEnd

    const duration = originalCue?.duration || cue.duration || 0
    const daysPlus = cue.startMode === CueStartMode.FIXED
      ? (cue.startDatePlus || 0)
      : differenceInCalendarDays(start, showStart, { in: tz(timezone) })

    const item: StartDuration = { start, duration, daysPlus }
    previousEnd = new Date(start.getTime() + duration)
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
    showStart,
  }: {
    timezone: string
    now: Date
    showStart: Date
  },
): Record<RundownCue['id'], StartDuration> {
  if (!cues.length) return {}

  const sdMap: Record<RundownCue['id'], StartDuration> = {}
  const sortedCueIds = cues.map((c) => c.id)
  let previousEnd = new Date(showStart)

  cues.forEach((cue) => {
    const cueRunState = determineCueRunState(cue.id, runner, sortedCueIds)
    const elapsedCue = runner.elapsedCues[cue.id]

    let start: Date
    let duration: number

    if (cueRunState === CueRunState.CUE_ACTIVE) {
      start = new Date(runner.timesnap.kickoff)
      duration = Math.max(now.getTime(), runner.timesnap.deadline) - runner.timesnap.kickoff
    } else if (cueRunState === CueRunState.CUE_PAST && elapsedCue) {
      start = new Date(elapsedCue.startTime)
      duration = elapsedCue.duration
    } else if (cueRunState === CueRunState.CUE_PAST) {
      start = previousEnd
      duration = 0
    } else if (cue.startMode === CueStartMode.FIXED && cue.startTime) {
      start = applyDate(cue.startTime, addDays(getStartOfDay(showStart, { timezone }), cue.startDatePlus || 0, { timezone }), { timezone })
      duration = cue.duration || 0
    } else {
      start = previousEnd
      duration = cue.duration || 0
    }

    const daysPlus = cue.startMode === CueStartMode.FIXED
      ? (cue.startDatePlus || 0)
      : differenceInCalendarDays(start, showStart, { in: tz(timezone) })

    const item: StartDuration = { start, duration, daysPlus }
    previousEnd = new Date(start.getTime() + duration)
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
function determineCueRunState (
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
