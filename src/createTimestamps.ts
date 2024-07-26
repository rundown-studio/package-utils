import { RundownCue, Runner, RunnerCue } from '@rundown-studio/types'
// import { applyDate, moveAfter } from '@rundown-studio/timeutils'
// import addMilliseconds from 'date-fns/addMilliseconds'
// import _isEqual from 'lodash/isEqual'

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

export interface Timestamp {
  id: RundownCue['id']
  index: number
  state: CueRunState | GroupRunState
  original: {
    start: Date
    duration: number
  }
  planned: {
    start: Date
    duration: number
  }
  actual: {
    start: Date
    duration: number
  }
}

export interface Timestamps {
  original: {
    start: Date
    duration: number
  }
  planned: {
    start: Date
    duration: number
  }
  actual: {
    start: Date
    duration: number
  }
  cues: Record<RundownCue['id'], Timestamp>
}

/**
 * Create timestamps from rundown and runner data
 *
 * @param  {Date} startTime
 * @param  {RundownCue[]} cues
 * @param  {Runner} runner
 * @param  {Date} [options.finishTime]
 * @param  {string} [options.timezone = 'UTC']
 * @param  {Date} [options.now = new Date()]
 * @return {Timestamps}
 */
export function createTimestamps (
  startTime: Date,
  cues: RundownCue[],
  runner: Runner | null,
  {
    endTime,
    timezone = 'UTC',
    now = new Date(),
  }: {
    endTime?: Date
    timezone?: string
    now?: Date
  } = {},
): Timestamps {
  if (!(startTime instanceof Date)) throw new Error('`startTime` must be a valid Date')
  if (!(now instanceof Date)) throw new Error('`now` must be an instance of Date')
  const tz = timezone || 'UTC'

  console.log('[createTimestamps]', { endTime, tz, now })

  // 1. Build the planned timestamps from cues
  // 2. Build the original timestamps from runner.originalCues & cues, or copy planned if runner=null
  // 3. Buid the actual timestamps from runner.timesnap, runner.elapsedCues & cues
  // 4. Aggregate global start & duration for these three categories

  const plannedTimestamps = createPlannedTimestamps(cues, startTime)
  const originalTimestamps = createOriginalTimestamps(cues, startTime, runner, plannedTimestamps)
  const actualTimestamps = createActualTimestamps(cues, startTime, runner, plannedTimestamps)

  const originalTotal = calculateTotalDuration(cues)
  const plannedTotal = calculateTotalDuration(cues)
  const actualTotal = runner
    ? runner.timesnap.deadline - runner.timesnap.kickoff
    : plannedTotal

  return {
    original: { start: startTime, duration: originalTotal },
    planned: { start: startTime, duration: plannedTotal },
    actual: { start: startTime, duration: actualTotal },
    cues: Object.fromEntries(
      Object.entries(plannedTimestamps).map(([id, timestamp]) => [
        id,
        {
          ...timestamp,
          original: originalTimestamps[id].original,
          actual: actualTimestamps[id].actual,
          state: actualTimestamps[id].state,
        },
      ]),
    ),
  }
}

/**
 * Get the cue's state
 * @param  {number} cueIndex
 * @param  {number} activeIndex
 * @param  {number} nextIndex
 * @return {string}
 */
// export function _getCueState (cueIndex, activeIndex, nextIndex) {
//   if (cueIndex === activeIndex) return CUE_STATE_ACTIVE
//   if (cueIndex === nextIndex) return CUE_STATE_NEXT
//   if (cueIndex < activeIndex) return CUE_STATE_PAST
//   return CUE_STATE_FUTURE
// }

/**
 * Get the actual duration of a cue, taking into account `elapsed` for past cues and `left` fro current cue
 * @param  {string} state
 * @param  {number} duration
 * @param  {number} elapsed
 * @param  {number} left
 * @return {number}
 */
// export function _getActualElapsed (state, duration = 0, elapsed, left) {
//   switch (state) {
//     case CUE_STATE_PAST:
//       return elapsed || 0
//     case CUE_STATE_ACTIVE:
//       return Math.max(duration - left, duration)
//     case CUE_STATE_NEXT:
//     case CUE_STATE_FUTURE:
//     default:
//       return duration
//   }
// }

/**
 * Calculate the total duration of a list of cues.
 * @param cues - An array of RundownCue or RunnerCue objects.
 * @returns The total duration in milliseconds.
 */
function calculateTotalDuration (
  cues: RundownCue[] | RunnerCue[],
): number {
  return cues.reduce((total: number, cue: RundownCue | RunnerCue) => total + cue.duration, 0)
}

/**
 * Create planned timestamps for each cue.
 * @param cues - An array of RundownCue objects.
 * @param startTime - The start time of the rundown.
 * @returns A record of planned Timestamp objects, keyed by cue ID.
 */
function createPlannedTimestamps (
  cues: RundownCue[],
  startTime: Date,
): Record<RundownCue['id'], Timestamp> {
  const plannedTimestamps: Record<RundownCue['id'], Timestamp> = {}
  let plannedStartTime = new Date(startTime)

  cues.forEach((cue, index) => {
    plannedTimestamps[cue.id] = {
      id: cue.id,
      index,
      state: CueRunState.CUE_FUTURE,
      planned: {
        start: new Date(plannedStartTime),
        duration: cue.duration,
      },
      original: { start: new Date(0), duration: 0 },
      actual: { start: new Date(0), duration: 0 },
    }
    plannedStartTime = new Date(plannedStartTime.getTime() + cue.duration)
  })

  return plannedTimestamps
}

/**
 * Create original timestamps for each cue.
 * @param cues - An array of RundownCue objects.
 * @param startTime - The start time of the rundown.
 * @param runner - The Runner object, if available.
 * @param plannedTimestamps - The planned timestamps.
 * @returns A record of original Timestamp objects, keyed by cue ID.
 */
function createOriginalTimestamps (
  cues: RundownCue[],
  startTime: Date,
  runner: Runner | null,
  plannedTimestamps: Record<RundownCue['id'], Timestamp>,
): Record<RundownCue['id'], Timestamp> {
  const originalTimestamps: Record<RundownCue['id'], Timestamp> = {}
  let originalStartTime = new Date(startTime)

  cues.forEach((cue) => {
    const originalCue = runner?.originalCues[cue.id] || cue
    originalTimestamps[cue.id] = {
      ...plannedTimestamps[cue.id],
      original: {
        start: new Date(originalStartTime),
        duration: originalCue.duration,
      },
    }
    originalStartTime = new Date(originalStartTime.getTime() + originalCue.duration)
  })

  return originalTimestamps
}

/**
 * Determine the state of a cue based on the runner and cue information.
 * @param cue - The RundownCue object.
 * @param runner - The Runner object, if available.
 * @param isNext - Whether this cue is the next cue.
 * @returns The CueRunState of the cue.
 */
function determineCueState (
  cue: RundownCue,
  runner: Runner | null,
  isNext: boolean,
): CueRunState {
  if (!runner) return CueRunState.CUE_FUTURE

  const elapsedCue = runner.elapsedCues[cue.id]
  const isActive = runner.timesnap.cueId === cue.id
  const isPast = elapsedCue !== undefined

  if (isPast) return CueRunState.CUE_PAST
  if (isActive) return CueRunState.CUE_ACTIVE
  if (isNext) return CueRunState.CUE_NEXT
  return CueRunState.CUE_FUTURE
}

/**
 * Create actual timestamps for each cue.
 * @param cues - An array of RundownCue objects.
 * @param startTime - The start time of the rundown.
 * @param runner - The Runner object, if available.
 * @param plannedTimestamps - The planned timestamps.
 * @returns A record of actual Timestamp objects, keyed by cue ID.
 */
function createActualTimestamps (
  cues: RundownCue[],
  startTime: Date,
  runner: Runner | null,
  plannedTimestamps: Record<RundownCue['id'], Timestamp>,
): Record<RundownCue['id'], Timestamp> {
  const actualTimestamps: Record<RundownCue['id'], Timestamp> = {}
  let actualStartTime = new Date(startTime)

  cues.forEach((cue) => {
    const elapsedCue = runner?.elapsedCues[cue.id]
    const isNext = runner?.nextCueId === cue.id

    const state = determineCueState(cue, runner, isNext)

    actualTimestamps[cue.id] = {
      ...plannedTimestamps[cue.id],
      state,
      actual: {
        start: new Date(actualStartTime),
        duration: elapsedCue ? elapsedCue.duration : cue.duration,
      },
    }
    actualStartTime = new Date(actualStartTime.getTime() + actualTimestamps[cue.id].actual.duration)
  })

  return actualTimestamps
}
