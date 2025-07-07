import { parse, isValid, parseISO } from 'date-fns'
import { applyDate, getStartOfDay } from '@rundown-studio/timeutils' // Helper function to validate date components

// Helper function to validate date components
function isValidDate (year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false

  // Basic validation - could be enhanced with leap year logic if needed
  // For now, we rely on the Date constructor and isValid() for precise validation
  return year > 0 && year <= 9999
}

// Helper function to validate time components
function isValidTime (hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59
}

// Helper function to convert 12-hour to 24-hour format
function convertTo24Hour (hour: number, ampm: string): number | undefined {
  if (hour < 1 || hour > 12) return undefined

  const isAM = ampm.toUpperCase() === 'AM'
  const isPM = ampm.toUpperCase() === 'PM'

  if (!isAM && !isPM) return undefined

  if (isPM && hour !== 12) return hour + 12
  if (isAM && hour === 12) return 0
  return hour
}

// Helper function to create a date with validation
function createValidatedDate (year: number, month: number, day: number, hour: number, minute: number, second: number): Date | undefined {
  if (!isValidDate(year, month, day)) return undefined
  if (!isValidTime(hour, minute, second)) return undefined

  const result = new Date(year, month - 1, day, hour, minute, second)
  return isValid(result) ? result : undefined
}

// Helper function to set time on today's date
function setTimeOnDate (baseDate: Date, hour: number, minute: number, second: number, timezone?: string): Date | undefined {
  if (!isValidTime(hour, minute, second)) return undefined

  const timeDate = new Date()
  timeDate.setUTCHours(hour, minute, second, 0)

  // Apply the date from baseDate to the time
  return applyDate(timeDate, baseDate, { timezone })
}

export function parseTimeToDate (input?: unknown, referenceDate?: Date, timezone?: string): Date | undefined {
  if (!input || typeof input !== 'string') {
    return undefined
  }

  const normalized = input.trim()
  if (!normalized) {
    return undefined
  }

  const today = getStartOfDay(referenceDate ?? new Date(), { timezone })

  try {
    // First try parsing with parseISO for proper ISO strings
    try {
      const parsedISO = parseISO(normalized)

      if (isValid(parsedISO)) {
        if (referenceDate) {
          return setTimeOnDate(
            today,
            parsedISO.getHours(),
            parsedISO.getMinutes(),
            parsedISO.getSeconds(),
            timezone,
          )
        }

        return parsedISO
      }
    } catch {
      // Continue to other parsing methods
    }

    // Pattern 1: YYYY-MM-DD HH:MM[:SS] [AM/PM]
    const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?$/i)
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10)
      const month = parseInt(isoMatch[2], 10)
      const day = parseInt(isoMatch[3], 10)
      let hour = parseInt(isoMatch[4], 10)
      const minute = parseInt(isoMatch[5], 10)
      const second = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0
      const ampm = isoMatch[7]

      if (ampm) {
        const convertedHour = convertTo24Hour(hour, ampm)
        if (convertedHour === undefined) return undefined
        hour = convertedHour
      }

      return createValidatedDate(year, month, day, hour, minute, second)
    }

    // Pattern 2: MM/DD/YYYY HH:MM[:SS] [AM/PM]
    const usMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?$/i)
    if (usMatch) {
      const month = parseInt(usMatch[1], 10)
      const day = parseInt(usMatch[2], 10)
      const year = parseInt(usMatch[3], 10)
      let hour = parseInt(usMatch[4], 10)
      const minute = parseInt(usMatch[5], 10)
      const second = usMatch[6] ? parseInt(usMatch[6], 10) : 0
      const ampm = usMatch[7]

      if (ampm) {
        const convertedHour = convertTo24Hour(hour, ampm)
        if (convertedHour === undefined) return undefined
        hour = convertedHour
      }

      return createValidatedDate(year, month, day, hour, minute, second)
    }

    // Pattern 3: MM-DD-YYYY HH:MM[:SS] [AM/PM]
    const dashMatch = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?$/i)
    if (dashMatch) {
      const month = parseInt(dashMatch[1], 10)
      const day = parseInt(dashMatch[2], 10)
      const year = parseInt(dashMatch[3], 10)
      let hour = parseInt(dashMatch[4], 10)
      const minute = parseInt(dashMatch[5], 10)
      const second = dashMatch[6] ? parseInt(dashMatch[6], 10) : 0
      const ampm = dashMatch[7]

      if (ampm) {
        const convertedHour = convertTo24Hour(hour, ampm)
        if (convertedHour === undefined) return undefined
        hour = convertedHour
      }

      return createValidatedDate(year, month, day, hour, minute, second)
    }

    // Pattern 4: Time with AM/PM (HH:MM[:SS] AM/PM)
    const amPmMatch = normalized.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)$/i)
    if (amPmMatch) {
      const hour12 = parseInt(amPmMatch[1], 10)
      const minute = parseInt(amPmMatch[2], 10)
      const second = amPmMatch[3] ? parseInt(amPmMatch[3], 10) : 0
      const ampm = amPmMatch[4]

      const hour24 = convertTo24Hour(hour12, ampm)
      if (hour24 === undefined) return undefined

      return setTimeOnDate(today, hour24, minute, second, timezone)
    }

    // Pattern 5: 24-hour time (HH:MM[:SS])
    const time24Match = normalized.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/)
    if (time24Match) {
      const hour = parseInt(time24Match[1], 10)
      const minute = parseInt(time24Match[2], 10)
      const second = time24Match[3] ? parseInt(time24Match[3], 10) : 0

      return setTimeOnDate(today, hour, minute, second, timezone)
    }

    // Pattern 6: Single hour with AM/PM (H AM/PM)
    const singleHourAmPmMatch = normalized.match(/^(\d{1,2})\s*(AM|PM)$/i)
    if (singleHourAmPmMatch) {
      const hour12 = parseInt(singleHourAmPmMatch[1], 10)
      const ampm = singleHourAmPmMatch[2]

      const hour24 = convertTo24Hour(hour12, ampm)
      if (hour24 === undefined) return undefined

      return setTimeOnDate(today, hour24, 0, 0, timezone)
    }

    // Pattern 7: Single hour in 24-hour format (H or HH)
    const singleHour24Match = normalized.match(/^(\d{1,2})$/)
    if (singleHour24Match) {
      const hour = parseInt(singleHour24Match[1], 10)
      if (hour > 23) return undefined

      // Use setTimeOnDate to handle timezone correctly
      return setTimeOnDate(today, hour, 0, 0, timezone)
    }

    // Pattern 8: Fallback to date-fns for additional format support
    const commonFormats = [
      'HH:mm:ss',
      'HH:mm',
      'h:mm:ss a',
      'h:mm a',
      'h a',
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd HH:mm',
      'MM/dd/yyyy HH:mm:ss',
      'MM/dd/yyyy HH:mm',
      'MM/dd/yyyy h:mm a',
      'dd/MM/yyyy HH:mm',
      'dd/MM/yyyy h:mm a',
      'MM-dd-yyyy HH:mm',
      'dd-MM-yyyy HH:mm',
    ]

    for (const formatStr of commonFormats) {
      try {
        const parsed = parse(normalized, formatStr, today)
        if (isValid(parsed)) {
          // For time-only formats, use today's date
          const isTimeOnlyFormat = !formatStr.includes('yyyy')
            && !formatStr.includes('MM/dd')
            && !formatStr.includes('dd/MM')
            && !formatStr.includes('MM-dd')
            && !formatStr.includes('dd-MM')

          if (isTimeOnlyFormat) {
            return setTimeOnDate(today, parsed.getHours(), parsed.getMinutes(), parsed.getSeconds(), timezone)
          }
          return parsed
        }
      } catch {
        // Continue to next format
      }
    }

    const date = Date.parse(input)

    if (!isNaN(date)) {
      const parsedDate = new Date(date)

      // Check if the parsed date might be just a time (year is 1970 or some other default)
      // If so, apply the time to the reference date instead
      if (referenceDate) {
        // This is likely just a time, so use the reference date
        return setTimeOnDate(
          today,
          parsedDate.getHours(),
          parsedDate.getMinutes(),
          parsedDate.getSeconds(),
          timezone,
        )
      }

      return parsedDate
    }

    return undefined
  } catch {
    return undefined
  }
}
