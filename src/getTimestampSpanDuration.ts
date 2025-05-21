import { addMilliseconds, differenceInMilliseconds } from 'date-fns'
import { Timestamp } from './createTimestamps'

/**
 * Calculates the total duration of a given span of timestamps, optionally adjusted based on a moment object.
 *
 * @param {Timestamp[]} spanTimestamps - An array of timestamp objects. Each timestamp should include `id`,
 * `actual.start`, and `actual.duration` properties.
 * @param {Object} [moment] - An optional object containing `cueId` and `left`. If provided, the duration calculation
 * will consider the position specified by the `moment` object, adding an absolute value of `moment.left`.
 * @param {string} moment.cueId - The identifier of the timestamp that the moment adjustment applies to.
 * @param {number} moment.left - The time left adjustment value for the specified `cueId`.
 * @return {number|undefined} Returns the calculated duration in milliseconds. If `spanTimestamps` is empty,
 * returns `undefined`.
 */
export function getTimestampSpanDuration (
  spanTimestamps: Timestamp[],
  moment?: { cueId: string, left: number },
): number | undefined {
  const [firstTimestamp] = spanTimestamps

  if (!firstTimestamp) return

  // Calculate total duration in one pass
  const totalGroupDuration = spanTimestamps.reduce((acc, timestamp) => {
    if (moment?.cueId === timestamp.id) return acc + Math.abs(moment.left)

    return acc + timestamp.actual.duration
  }, 0)

  return differenceInMilliseconds(
    firstTimestamp.actual.start,
    addMilliseconds(
      firstTimestamp.actual.start,
      totalGroupDuration,
    ),
  )
}
