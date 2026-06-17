import { tz } from '@date-fns/tz'
import { addDays, applyDate, getStartOfDay } from '@rundown-studio/timeutils'
import type { Cue, RundownCueOrderItem, Runner } from '@rundown-studio/types'
import { CueStartMode, CueType, RunnerState } from '@rundown-studio/types'
import { differenceInCalendarDays } from 'date-fns'
import _ from 'lodash'
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
  id: Cue['id']
  index: number // The index of the cue in the original cues array
  state: CueRunState | GroupRunState
  original: StartDuration
  actual: StartDuration
}

export interface Timestamps {
  original: StartDuration
  actual: StartDuration
  cues: Record<Cue['id'], Timestamp>
}

/**
 * Create timestamps from rundown and runner data
 *
 * @param  {Cue[]} cues
 * @param  {RundownCueOrderItem[]} cueOrder
 * @param  {Runner | null} runner
 * @param  {Date} startTime - The rundown start time
 * @param  {string} [options.timezone = 'UTC']
 * @param  {Date} [options.now = new Date()]
 * @return {Timestamps}
 */
export function createTimestamps(
  cues: Cue[],
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
  const cueIndexMap: Record<Cue['id'], number> = Object.fromEntries(
    cues.map((cue, index): [Cue['id'], number] => [cue.id, index]),
  )

  // Create a list of cues (type=CueType.CUE) in order, ignoring groups
  const sortedCues = getSortedCues(cues, cueOrder)
  const sortedCueIds = sortedCues.map((c) => c.id)
  const skippedCueIds = getSkippedCueIds(cues, cueOrder)

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
  const originalStartDurations = createOriginalStartDurations(sortedCues, runner, {
    timezone,
    showStart: originalShowStart,
    skippedCueIds,
  })

  // Build the actual timestamps
  let actualStartDurations: Record<Cue['id'], StartDuration>
  if (runnerState === RunnerState.PRESHOW) {
    // During preshow, actual matches original
    actualStartDurations = originalStartDurations
  } else {
    // During show and after, calculate actual durations from runner data
    actualStartDurations = createActualStartDurations(sortedCues, runner!, {
      timezone,
      now,
      showStart: actualShowStart,
      skippedCueIds,
    })
  }

  // Aggregate global start & duration (excluding skipped cues and children of skipped parents)
  const originalTotal = calculateTotalStartDuration(_.omitBy(originalStartDurations, (_v, id) => skippedCueIds.has(id)))
  const actualTotal = calculateTotalStartDuration(_.omitBy(actualStartDurations, (_v, id) => skippedCueIds.has(id)))

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
 * @param cues - An array of all Cue objects.
 * @param cueOrder - A hierarchical structure representing the order of cues, potentially including groups.
 * @returns A flat array of Cue objects, sorted according to the cueOrder and containing only cues of type CueType.CUE.
 *
 * @description
 * This function traverses the hierarchical cueOrder structure and creates a flat list of cues.
 * It only includes cues of type CueType.CUE, ignoring HEADING and GROUP types.
 * The resulting array maintains the order specified in the cueOrder structure, including nested orders within groups.
 */
export function getSortedCues(cues: Cue[], cueOrder: RundownCueOrderItem[]): Cue[] {
  const cueMap = new Map(cues.map((cue) => [cue.id, cue]))
  const sortedCues: Cue[] = []

  function traverse(items: RundownCueOrderItem[]) {
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
 * Collects IDs of cues that should be skipped, including children of skipped parents.
 */
function getSkippedCueIds(cues: Cue[], cueOrder: RundownCueOrderItem[]): Set<Cue['id']> {
  const cueMap = new Map(cues.map((cue) => [cue.id, cue]))
  const skipped = new Set<Cue['id']>()

  function collectSkipped(items: RundownCueOrderItem[], parentSkipped: boolean) {
    for (const item of items) {
      const cue = cueMap.get(item.id)
      const isSkipped = parentSkipped || !!cue?.settings?.skipDuringShow
      if (isSkipped && cue) {
        skipped.add(cue.id)
      }
      if (item.children) {
        collectSkipped(item.children, isSkipped)
      }
    }
  }

  collectSkipped(cueOrder, false)
  return skipped
}

/**
 * Calculate the total duration of a list of cues.
 * @param items - An array of Cue or RunnerCue objects.
 * @returns The start time and total duration in milliseconds.
 */
function calculateTotalStartDuration(items: Record<Cue['id'], StartDuration>): StartDuration {
  if (_.isEmpty(items)) return { start: new Date(0), duration: 0, daysPlus: 0 }
  const sdArray = Object.values(items)
  const firstSD = sdArray[0]
  const lastSD = sdArray[sdArray.length - 1]
  return {
    start: firstSD.start,
    duration: lastSD.start.getTime() + lastSD.duration - firstSD.start.getTime(),
    daysPlus: 0, // Always 0 for rundown total
  }
}

/**
 * Creates a map of original start times and durations for a list of cues.
 *
 * @param cues - An array of Cue objects representing the cues in the rundown.
 * @param runner - A Runner object or null, containing original cue information if available.
 * @returns A record mapping cue IDs to their original StartDuration objects.
 *
 * @description
 * This function generates a map of original start times and durations for each cue in the rundown.
 * It takes into account both the runner's original cue information (if available) and the cue's
 * own properties.
 */
function createOriginalStartDurations(
  cues: Cue[],
  runner: Runner | null,
  {
    timezone,
    showStart,
    skippedCueIds,
  }: {
    timezone: string
    showStart: Date
    skippedCueIds: Set<Cue['id']>
  },
): Record<Cue['id'], StartDuration> {
  if (!cues.length) return {}

  const sdMap: Record<Cue['id'], StartDuration> = {}
  const startOfFirstDay = getStartOfDay(showStart, { timezone })
  let previousEnd = new Date(showStart)

  cues.forEach((cue) => {
    const originalCue = runner?.originalCues[cue.id]
    const daysToAdd = cue.startDatePlus || 0

    const adjustedStartTime =
      cue.startTime && applyDate(cue.startTime, addDays(startOfFirstDay, daysToAdd, { timezone }), { timezone })
    const hardStart = cue.startMode === CueStartMode.FIXED ? (adjustedStartTime ?? null) : null
    const start: Date = hardStart || previousEnd

    const duration = originalCue?.duration ?? cue.duration ?? 0
    const daysPlus =
      cue.startMode === CueStartMode.FIXED
        ? cue.startDatePlus || 0
        : differenceInCalendarDays(start, showStart, { in: tz(timezone) })

    const item: StartDuration = { start, duration, daysPlus }
    if (!skippedCueIds.has(cue.id)) {
      previousEnd = new Date(start.getTime() + duration)
    }
    sdMap[cue.id] = item
  })

  return sdMap
}

/**
 * Create actual StartDuration records for each cue, representing what actually happened and the projected changes thereof.
 * @param cues - An array of Cue objects.
 * @param runner - The Runner object, if available.
 * @param now - The current time.
 * @param idealStartDurations - The ideal StartDuration records.
 * @returns A record of actual StartDuration objects, keyed by cue ID.
 */
function createActualStartDurations(
  cues: Cue[],
  runner: Runner,
  {
    timezone,
    now,
    showStart,
    skippedCueIds,
  }: {
    timezone: string
    now: Date
    showStart: Date
    skippedCueIds: Set<Cue['id']>
  },
): Record<Cue['id'], StartDuration> {
  if (!cues.length) return {}

  const sdMap: Record<Cue['id'], StartDuration> = {}
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
      start = applyDate(
        cue.startTime,
        addDays(getStartOfDay(showStart, { timezone }), cue.startDatePlus || 0, { timezone }),
        { timezone },
      )
      duration = cue.duration ?? 0
    } else {
      start = previousEnd
      duration = cue.duration ?? 0
    }

    const daysPlus =
      cue.startMode === CueStartMode.FIXED
        ? cue.startDatePlus || 0
        : differenceInCalendarDays(start, showStart, { in: tz(timezone) })

    const item: StartDuration = { start, duration, daysPlus }
    if (!skippedCueIds.has(cue.id)) {
      previousEnd = new Date(start.getTime() + duration)
    }
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
function determineCueRunState(cueId: Cue['id'], runner: Runner | null, sortedCueIds: Cue['id'][]): CueRunState {
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
