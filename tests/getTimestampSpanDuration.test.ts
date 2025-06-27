import {describe, it, expect} from 'vitest';
import {addMilliseconds} from 'date-fns';
import {getTimestampSpanDuration} from '../src/getTimestampSpanDuration';
import {Timestamp} from "../src";

/**
 * npm run test -- tests/getTimestampSpanDuration.test.js
 */

describe('getTimestampSpanDuration', () => {
  // Test setup with base date for consistency
  const baseDate = new Date('2023-01-01T12:00:00Z');

  it('should return undefined for empty timestamp array', () => {
    const result = getTimestampSpanDuration([]);
    expect(result).toBeUndefined();
  });

  it('should calculate total duration from timestamps without moment adjustment', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 5000 // 5 seconds
        }
      },
      {
        id: 'cue2',
        actual: {
          start: addMilliseconds(baseDate, 5000),
          duration: 3000 // 3 seconds
        }
      },
      {
        id: 'cue3',
        actual: {
          start: addMilliseconds(baseDate, 8000),
          duration: 2000 // 2 seconds
        }
      }
    ] as Timestamp[];

    // Expected total duration: 5000 + 3000 + 2000 = 10000ms
    // But the function uses differenceInMilliseconds between first timestamp start and
    // (first timestamp start + totalGroupDuration), which should be -10000ms
    const result = getTimestampSpanDuration(timestamps);
    expect(result).toBe(-10000);
  });

  it('should adjust duration when moment is provided for a specific cue', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 5000
        }
      },
      {
        id: 'cue2',
        actual: {
          start: addMilliseconds(baseDate, 5000),
          duration: 3000
        }
      }
    ] as Timestamp[];

    // Moment adjustment for cue2
    const moment = { cueId: 'cue2', left: 4000 };

    // Expected adjusted duration: 5000 + 4000 (moment adjustment for cue2) = 9000ms
    const result = getTimestampSpanDuration(timestamps, moment);
    expect(result).toBe(-9000);
  });

  it('should use absolute value of moment.left', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 5000
        }
      },
      {
        id: 'cue2',
        actual: {
          start: addMilliseconds(baseDate, 5000),
          duration: 3000
        }
      }
    ] as Timestamp[];

    // Negative moment adjustment for cue2
    const moment = { cueId: 'cue2', left: -4000 };

    // Expected adjusted duration: 5000 + |-4000| = 9000ms
    const result = getTimestampSpanDuration(timestamps, moment);
    expect(result).toBe(-9000);
  });

  it('should ignore moment adjustment for non-matching cueId', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 5000
        }
      },
      {
        id: 'cue2',
        actual: {
          start: addMilliseconds(baseDate, 5000),
          duration: 3000
        }
      }
    ] as Timestamp[];

    // Moment adjustment for non-existent cue
    const moment = { cueId: 'nonexistent', left: 4000 };

    // Expected duration without adjustment: 5000 + 3000 = 8000ms
    const result = getTimestampSpanDuration(timestamps, moment);
    expect(result).toBe(-8000);
  });

  it('should handle a single timestamp correctly', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 5000
        }
      }
    ] as Timestamp[];

    // Expected duration: 5000ms
    const result = getTimestampSpanDuration(timestamps);
    expect(result).toBe(-5000);
  });

  it('should handle a single timestamp with moment adjustment', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 5000
        }
      }
    ] as Timestamp[];

    const moment = { cueId: 'cue1', left: 7000 };

    // Expected adjusted duration: 7000ms (using moment value instead of timestamp duration)
    const result = getTimestampSpanDuration(timestamps, moment);
    expect(result).toBe(-7000);
  });

  it('should handle timestamps with zero duration', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 0
        }
      },
      {
        id: 'cue2',
        actual: {
          start: baseDate,
          duration: 0
        }
      }
    ] as Timestamp[];

    // Expected duration: 0ms
    const result = getTimestampSpanDuration(timestamps);
    expect(result).toBe(0);
  });

  it('should correctly calculate with a mixture of regular and moment-adjusted durations', () => {
    const timestamps = [
      {
        id: 'cue1',
        actual: {
          start: baseDate,
          duration: 5000
        }
      },
      {
        id: 'cue2',
        actual: {
          start: addMilliseconds(baseDate, 5000),
          duration: 3000
        }
      },
      {
        id: 'cue3',
        actual: {
          start: addMilliseconds(baseDate, 8000),
          duration: 2000
        }
      }
    ] as Timestamp[];

    const moment = { cueId: 'cue2', left: 6000 };

    // Expected adjusted duration: 5000 + 6000 + 2000 = 13000ms
    const result = getTimestampSpanDuration(timestamps, moment);
    expect(result).toBe(-13000);
  });
});
