import { RundownCue, RundownCueOrderItem, Runner, CueStartMode, CueType } from '@rundown-studio/types'
// import { applyDate, moveAfter } from '@rundown-studio/timeutils'

/**
 * Questions
 * - remove startTime / endTime and use first cue startTime?
 * - How to name startMode?
 */

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
 * ideal - is the ideal timing of the show according to the values saved in the database
 * actual - is a record of what actually happened and the projected changes thereof
 */

export interface StartDuration {
  start: Date
  duration: number
}

export interface Timestamp {
  id: RundownCue['id']
  index: number
  state: CueRunState | GroupRunState
  original: StartDuration
  ideal: StartDuration
  actual: StartDuration
}

export interface Timestamps {
  original: StartDuration
  ideal: StartDuration
  actual: StartDuration
  cues: Record<RundownCue['id'], Timestamp>
}

/**
 * Create timestamps from rundown and runner data
 *
 * @param  {RundownCue[]} cues
 * @param  {RundownCueOrderItem[]} cueOrder
 * @param  {Runner} runner
 * @param  {string} [options.timezone = 'UTC']
 * @param  {Date} [options.now = new Date()]
 * @return {Timestamps}
 */
export function createTimestamps (
  cues: RundownCue[],
  cueOrder: RundownCueOrderItem[],
  runner: Runner | null,
  {
    timezone = 'UTC',
    now = new Date(),
  }: {
    timezone?: string
    now?: Date
  } = {},
): Timestamps {
  if (!(now instanceof Date)) throw new Error('`now` must be an instance of Date')
  const tz = timezone || 'UTC'

  console.log('[createTimestamps] tz', tz)

  // Remember the original cue index
  const cueIndexMap: Record<RundownCue['id'], number> = Object.fromEntries(
    cues.map((cue, index): [RundownCue['id'], number] => [cue.id, index]),
  )

  // Create a list of cues (type=CueType.CUE) in order, ignoring groups
  const sortedCues = getSortedCues(cues, cueOrder)

  // 1. Build the ideal timestamps from cues
  const idealStartDurations = createIdealStartDurations(sortedCues)

  // 2. Build the original timestamps from runner.originalCues & cues, or copy ideal if runner=null
  const originalStartDurations = createOriginalStartDurations(sortedCues, runner, idealStartDurations)

  // 3. Buid the actual timestamps from runner.timesnap, runner.elapsedCues & cues
  const actualStartDurations = createActualStartDurations(sortedCues, runner, now, idealStartDurations)

  // 4. Aggregate global start & duration for these three categories
  const originalTotal = calculateTotalStartDuration(originalStartDurations)
  const idealTotal = calculateTotalStartDuration(idealStartDurations)
  const actualTotal = calculateTotalStartDuration(actualStartDurations)

  return {
    original: originalTotal,
    ideal: idealTotal,
    actual: actualTotal,
    cues: Object.fromEntries(
      cues.map((cue): [Timestamp['id'], Timestamp] => [
        cue.id,
        {
          id: cue.id,
          index: cueIndexMap[cue.id],
          state: determineCueState(cue.id, runner),
          original: originalStartDurations[cue.id],
          ideal: idealStartDurations[cue.id],
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
 * Create ideal StartDuration records for each cue, representing is the ideal timing of the show according to the values saved in the database.
 * @param cues - An array of RundownCue objects.
 * @returns A record of ideal StartDuration objects, keyed by cue ID.
 */
function createIdealStartDurations (
  cues: RundownCue[],
): Record<RundownCue['id'], StartDuration> {
  if (!cues.length) return {}
  if (!cues[0].startTime) throw new Error(`First cue (id=${cues[0].id}) always needs a start time`)

  const sdMap: Record<RundownCue['id'], StartDuration> = {}
  let previousEnd: Date

  cues.forEach((cue) => {
    const item = {
      start: cue.startTime ? new Date(cue.startTime) : previousEnd,
      duration: cue.duration,
    }
    previousEnd = new Date(item.start.getTime() + cue.duration)
    sdMap[cue.id] = item
  })

  return sdMap
}

/**
 * Create original StartDuration records for each cue, representing the values as they were when the rundown was started, a "snapshot" of the moment in time.
 * @param cues - An array of RundownCue objects.
 * @param runner - The Runner object, if available.
 * @param idealStartDurations - The ideal StartDuration records.
 * @returns A record of original StartDuration objects, keyed by cue ID.
 */
function createOriginalStartDurations (
  cues: RundownCue[],
  runner: Runner | null,
  idealStartDurations: Record<RundownCue['id'], StartDuration>,
): Record<RundownCue['id'], StartDuration> {
  if (!runner) return idealStartDurations
  if (!cues.length) return {}

  const firstOriginalCue = runner.originalCues[cues[0].id]
  if (!firstOriginalCue?.startTime) throw new Error(`First cue (id=${cues[0].id}) always needs a start time`)

  const sdMap: Record<RundownCue['id'], StartDuration> = {}
  let previousEnd: Date

  cues.forEach((cue) => {
    const originalCue = runner.originalCues[cue.id]
    const item = {
      start: originalCue.startTime ? new Date(originalCue.startTime) : previousEnd,
      duration: originalCue.duration,
    }
    previousEnd = new Date(item.start.getTime() + cue.duration)
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
  runner: Runner | null,
  now: Date,
  idealStartDurations: Record<RundownCue['id'], StartDuration>,
): Record<RundownCue['id'], StartDuration> {
  if (!runner) return idealStartDurations
  if (!cues.length) return {}

  const sdMap: Record<RundownCue['id'], StartDuration> = {}
  let previousEnd: Date

  cues.forEach((cue) => {
    const elapsedCue = runner.elapsedCues[cue.id]
    const isCurrent = runner.timesnap.cueId === cue.id

    let item: StartDuration
    if (elapsedCue) {
      item = {
        start: elapsedCue.startTime,
        duration: elapsedCue.duration,
      }
    } else if (isCurrent) {
      item = {
        start: new Date(runner.timesnap.kickoff),
        duration: Math.max(now.getTime(), runner.timesnap.deadline) - runner.timesnap.kickoff,
      }
    } else {
      const lockedStart = cue.startMode === CueStartMode.LOCKED ? cue.startTime : null
      item = {
        start: lockedStart || previousEnd,
        duration: cue.duration,
      }
    }

    previousEnd = new Date(item.start.getTime() + cue.duration)
    sdMap[cue.id] = item
  })

  return sdMap
}

/**
 * Determine the state of a cue based on the runner.
 * @param cueId - The ID of the cue in question.
 * @param runner - The Runner object, if available.
 * @returns The CueRunState of the cue.
 */
function determineCueState (
  cueId: RundownCue['id'],
  runner: Runner | null,
): CueRunState {
  if (!runner) return CueRunState.CUE_FUTURE

  const isPast = Boolean(runner.elapsedCues[cueId])
  const isActive = runner.timesnap.cueId === cueId
  const isNext = runner.nextCueId === cueId

  if (isPast) return CueRunState.CUE_PAST
  if (isActive) return CueRunState.CUE_ACTIVE
  if (isNext) return CueRunState.CUE_NEXT
  return CueRunState.CUE_FUTURE
}
