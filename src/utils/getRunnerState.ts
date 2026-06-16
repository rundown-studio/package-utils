import { Runner, RunnerState } from '@rundown-studio/types'

/**
 * Determine the current state of the runner
 *
 * @param runner - The runner object, if it exists
 * @returns The current RunnerState
 */
export function getRunnerState (runner: Runner | null): RunnerState {
  if (runner === null) return RunnerState.PRESHOW
  if (runner.timesnap.cueId === null) return RunnerState.ENDED
  return RunnerState.ONAIR
}
