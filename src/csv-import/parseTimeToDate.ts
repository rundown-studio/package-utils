import { parse, isValid, parseISO } from 'date-fns'
import { applyDate, getStartOfDay, parse as timeutilsParse, format, getTimezoneOffset } from '@rundown-studio/timeutils' // Helper function to validate date components

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

// Helper function to validate timezone
function validateTimezone(timezone: string): { isValid: boolean; error?: string } {
  try {
    // Test the timezone by attempting to get offset for current time
    getTimezoneOffset(timezone, new Date())
    return { isValid: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid time zone')) {
      return { 
        isValid: false, 
        error: `Invalid timezone "${timezone}". Please use a valid IANA timezone identifier (e.g., "America/New_York", "Europe/Berlin", "UTC").`
      }
    }
    // Re-throw unexpected errors
    throw error
  }
}

// Helper function to set time on today's date
function setTimeOnDate (baseDate: Date, hour: number, minute: number, second: number, timezone?: string): Date | undefined {
  if (!isValidTime(hour, minute, second)) return undefined

  // Format the time components into a parseable string
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
  
  // Get the date string in the target timezone to ensure correct date context
  const dateStr = format(baseDate, 'yyyy-MM-dd', { timezone: timezone || 'UTC' })
  
  // Combine date and time, then parse in the specified timezone
  const dateTimeStr = `${dateStr} ${timeStr}`
  
  // Parse the combined string in the specified timezone - this correctly interprets 
  // the time as local time in that timezone and returns UTC
  return timeutilsParse(dateTimeStr, 'yyyy-MM-dd HH:mm:ss', baseDate, { timezone: timezone || 'UTC' })
}

type Options = {
  referenceDate?: Date
  timezone?: string
}

/**
 * Parses a string representation of time or date-time into a JavaScript Date object.
 *
 * This function supports a wide variety of time and date-time formats commonly found in CSV files
 * and other data sources. It attempts to intelligently parse the input using multiple strategies.
 *
 * @param {unknown} input - The string to parse. If not a string or empty, returns undefined.
 * @param {Object} options - Parsing options
 * @param {Date} [options.referenceDate] - Optional reference date to use when parsing time-only inputs.
 *                                         If provided, the date portion of the result will be set to this date.
 * @param {string} [options.timezone] - Optional timezone identifier to use for parsing.
 *
 * @returns {Date|undefined} A Date object if parsing was successful, undefined otherwise.
 *
 * @example
 * // Supported formats include (but are not limited to):
 *
 * // ISO 8601 and similar
 * parseTimeToDate('2022-01-01T20:30:00Z')           // Full ISO string
 * parseTimeToDate('2022-01-01 20:30')               // ISO-like format
 *
 * // Date-time combinations
 * parseTimeToDate('01/01/2022 20:30')               // MM/DD/YYYY format
 * parseTimeToDate('01-01-2022 20:30')               // MM-DD-YYYY format
 * parseTimeToDate('2022-01-01 8:30 PM')             // With AM/PM
 *
 * // Time-only formats (uses referenceDate if provided)
 * parseTimeToDate('20:30')                          // 24-hour format
 * parseTimeToDate('8:30 PM')                        // 12-hour with AM/PM
 * parseTimeToDate('8:30:15 PM')                     // With seconds
 * parseTimeToDate('8 PM')                           // Single hour with AM/PM
 * parseTimeToDate('20')                             // Single hour in 24-hour format
 *
 * // The function handles validation and returns undefined for invalid inputs:
 * parseTimeToDate('25:30')                          // Invalid hour
 * parseTimeToDate('20:60')                          // Invalid minute
 * parseTimeToDate('13:30 PM')                       // Invalid 12-hour format
 */
export function parseTimeToDate (input?: unknown, {
  referenceDate,
  timezone,
}: Options = {}): Date | undefined {
  if (!input || typeof input !== 'string') {
    return undefined
  }

  const normalized = input.trim()
  if (!normalized) {
    return undefined
  }

  // Validate timezone if provided
  if (timezone) {
    const validation = validateTimezone(timezone)
    if (!validation.isValid) {
      throw new Error(validation.error!)
    }
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
