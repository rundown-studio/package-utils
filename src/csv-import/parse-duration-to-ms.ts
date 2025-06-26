import { addSeconds, addMinutes, addHours, differenceInMilliseconds } from 'date-fns'

export function parseDurationToMs (input?: unknown) {
  if (!input || typeof input !== 'string') {
    return undefined
  }

  const normalized = input.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }

  try {
    // Helper to convert time components to milliseconds using date-fns
    const toMilliseconds = (hours = 0, minutes = 0, seconds = 0) => {
      const baseDate = new Date(0) // Unix epoch
      const resultDate = addSeconds(
        addMinutes(
          addHours(baseDate, hours),
          minutes,
        ),
        seconds,
      )
      return differenceInMilliseconds(resultDate, baseDate)
    }

    // Pattern 1: Colon-separated formats (HH:MM:SS, MM:SS)
    const colonMatch = normalized.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/)
    if (colonMatch) {
      const [, first, second, third] = colonMatch.map((x) => x ? parseInt(x, 10) : undefined)

      if (third !== undefined) {
        // HH:MM:SS format
        if (second && (second >= 60 || third >= 60)) return undefined
        return toMilliseconds(first, second, third)
      } else {
        // MM:SS format
        if (second && second >= 60) return undefined
        return toMilliseconds(0, first, second)
      }
    }

    // Pattern 2: Single quote notation for minutes (90')
    const quoteMatch = normalized.match(/^(\d+)'$/)
    if (quoteMatch) {
      const minutes = parseInt(quoteMatch[1], 10)
      return toMilliseconds(0, minutes, 0)
    }

    // Pattern 3: Text-based formats with explicit units
    const textComponents = {
      hours: extractTimeComponent(normalized, ['hours?', 'hrs?', 'h']),
      minutes: extractTimeComponent(normalized, ['minutes?', 'mins?', 'm']),
      seconds: extractTimeComponent(normalized, ['seconds?', 'secs?', 's']),
    }

    if (textComponents.hours !== null || textComponents.minutes !== null || textComponents.seconds !== null) {
      return toMilliseconds(
        textComponents.hours || 0,
        textComponents.minutes || 0,
        textComponents.seconds || 0,
      )
    }

    // Pattern 4: Single unit formats (90m, 45s, 2h)
    const singleUnitMatch = normalized.match(/^(\d+)\s*([hms])$/)
    if (singleUnitMatch) {
      const value = parseInt(singleUnitMatch[1], 10)
      const unitMap = { h: [value, 0, 0], m: [0, value, 0], s: [0, 0, value] }
      const [hours, minutes, seconds] = unitMap[singleUnitMatch[2] as keyof typeof unitMap]
      return toMilliseconds(hours, minutes, seconds)
    }

    // Pattern 5: Plain number (assumes minutes)
    const plainNumberMatch = normalized.match(/^(\d+)$/)
    if (plainNumberMatch) {
      const minutes = parseInt(plainNumberMatch[1], 10)
      return toMilliseconds(0, minutes, 0)
    }

    return undefined
  } catch {
    return undefined
  }
}

// Helper function to extract time components from text
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
