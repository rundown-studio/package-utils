import { hmsToMilliseconds } from '@rundown-studio/timeutils'

/**
 * Parses a string representation of a duration and converts it to milliseconds.
 * This function supports multiple duration formats including colon-separated times,
 * text-based formats with units, single unit formats, and plain numbers.
 *
 * @param input - The input to parse. Should be a string representing a duration.
 * @returns The duration in milliseconds, or undefined if parsing fails.
 *
 * @example
 * // Colon-separated formats
 * parseDurationToMs('1:30:45') // 1h 30m 45s = 5,445,000ms
 * parseDurationToMs('5:30')    // 5m 30s = 330,000ms
 *
 * @example
 * // Single quote notation for minutes
 * parseDurationToMs("90'")     // 90m = 5,400,000ms
 *
 * @example
 * // Text-based formats with explicit units
 * parseDurationToMs('2 hours 30 minutes') // 2h 30m = 9,000,000ms
 * parseDurationToMs('1h 20m 30s')         // 1h 20m 30s = 4,830,000ms
 *
 * @example
 * // Single unit formats
 * parseDurationToMs('90m')     // 90m = 5,400,000ms
 * parseDurationToMs('45s')     // 45s = 45,000ms
 * parseDurationToMs('2h')      // 2h = 7,200,000ms
 *
 * @example
 * // Plain number (assumes minutes)
 * parseDurationToMs('90')      // 90m = 5,400,000ms
 *
 * @example
 * // Invalid inputs
 * parseDurationToMs('')        // undefined
 * parseDurationToMs(null)      // undefined
 * parseDurationToMs(undefined) // undefined
 * parseDurationToMs(123)       // undefined (not a string)
 */
export function parseDurationToMs (input?: unknown): number | undefined {
  if (!input || typeof input !== 'string') {
    return undefined
  }

  const normalized = input.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }

  try {
    // Pattern 1: Colon-separated formats (HH:MM:SS, MM:SS)
    const colonMatch = normalized.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/)
    if (colonMatch) {
      const [, hours = 0, minutes = 0, seconds] = colonMatch.map((x) => x ? parseInt(x, 10) : undefined)

      if (seconds !== undefined) {
        // HH:MM:SS format
        if (minutes && (minutes >= 60 || seconds >= 60)) return undefined
        return hmsToMilliseconds({
          hours,
          minutes,
          seconds,
        })
      } else {
        // MM:SS format
        if (minutes && minutes >= 60) return undefined
        return hmsToMilliseconds({
          hours,
          minutes,
          seconds: 0,
        })
      }
    }

    // Pattern 2: Single quote notation for minutes (90')
    const quoteMatch = normalized.match(/^(\d+)'$/)
    if (quoteMatch) {
      const minutes = parseInt(quoteMatch[1], 10)
      return hmsToMilliseconds({
        hours: 0,
        minutes,
        seconds: 0,
      })
    }

    // Pattern 3: Text-based formats with explicit units
    const textComponents = {
      hours: extractTimeComponent(normalized, ['hours?', 'hrs?', 'h']),
      minutes: extractTimeComponent(normalized, ['minutes?', 'mins?', 'm']),
      seconds: extractTimeComponent(normalized, ['seconds?', 'secs?', 's']),
    }

    if (textComponents.hours !== null || textComponents.minutes !== null || textComponents.seconds !== null) {
      return hmsToMilliseconds({
        hours: textComponents.hours ?? 0,
        minutes: textComponents.minutes ?? 0,
        seconds: textComponents.seconds ?? 0,
      },
      )
    }

    // Pattern 4: Single unit formats (90m, 45s, 2h)
    const singleUnitMatch = normalized.match(/^(\d+)\s*([hms])$/)
    if (singleUnitMatch) {
      const value = parseInt(singleUnitMatch[1], 10)
      const unitMap = { h: [value, 0, 0], m: [0, value, 0], s: [0, 0, value] }
      const [hours, minutes, seconds] = unitMap[singleUnitMatch[2] as keyof typeof unitMap]
      return hmsToMilliseconds({
        hours,
        minutes,
        seconds,
      })
    }

    // Pattern 5: Plain number (assumes minutes)
    const plainNumberMatch = normalized.match(/^(\d+)$/)
    if (plainNumberMatch) {
      const minutes = parseInt(plainNumberMatch[1], 10)

      return hmsToMilliseconds({
        hours: 0,
        minutes,
        seconds: 0,
      })
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Helper function to extract time components from text.
 * Searches for patterns like "2 hours", "30 mins", "45s" in the input text.
 * Used internally by parseDurationToMs to handle text-based duration formats.
 *
 * @param text - The text to search for time components.
 * @param unitPatterns - Array of regex patterns for time units (e.g., ['hours?', 'hrs?', 'h']).
 * @returns The extracted numeric value, or null if no match is found.
 * @private
 */
function extractTimeComponent (text: string, unitPatterns: string[]) {
  for (const pattern of unitPatterns) {
    const regex = new RegExp(`(\\d+)\\s*${pattern}`, 'i')
    const match = text.match(regex)

    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return null
}
