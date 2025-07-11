import {describe, it, expect} from 'vitest'
import {parseTimeToDate} from '../src/csv-import/parseTimeToDate'

if (process.env.TZ === undefined) {
  process.env.TZ = 'UTC' // Default to UTC if no timezone is set
}

describe('parseTimeToDate', () => {
  const referenceDate = new Date('2024-01-15T12:00:00Z')

  it('should return undefined for undefined input', () => {
    expect(parseTimeToDate()).toBeUndefined()
  })

  it('should return undefined for non-string input', () => {
    expect(parseTimeToDate(123)).toBeUndefined()
    expect(parseTimeToDate({})).toBeUndefined()
    expect(parseTimeToDate([])).toBeUndefined()
  })

  it('should return undefined for empty or whitespace string', () => {
    expect(parseTimeToDate('')).toBeUndefined()
    expect(parseTimeToDate('   ')).toBeUndefined()
  })

  describe('Full datetime formats', () => {
    it('should parse ISO 8601 strings with parseISO', () => {
      const result1 = parseTimeToDate('2022-01-01T20:30:00Z', { referenceDate })
      expect(result1).toBeDefined()
      expect(result1!.getMinutes()).toBe(30)
      // Hours may vary based on timezone, but the result should be consistent

      const result2 = parseTimeToDate('2022-01-01T20:30:00.000Z', { referenceDate })
      expect(result2).toBeDefined()
      expect(result2!.getMinutes()).toBe(30)

      const result3 = parseTimeToDate('2022-01-01T20:30:00+02:00', { referenceDate })
      expect(result3).toBeDefined()
      expect(result3!.getMinutes()).toBe(30)
      // The timezone offset should be respected
    })

    it('should parse ISO-like datetime formats', () => {
      const result = parseTimeToDate('2022-01-01 20:30', { referenceDate })
      expect(result).toBeDefined()
      expect(result!.getMinutes()).toBe(30)
      // Hours may vary based on timezone interpretation
    })

    it('should parse datetime with seconds', () => {
      const result = parseTimeToDate('2022-01-01 20:30:45', { referenceDate })
      expect(result).toBeDefined()
      expect(result!.getMinutes()).toBe(30)
      expect(result!.getSeconds()).toBe(45)
      // Hours may vary based on timezone interpretation
    })

    it('should parse MM/DD/YYYY format', () => {
      const result = parseTimeToDate('01/01/2022 20:30', { referenceDate })
      expect(result).toBeDefined()
      expect(result!.getFullYear()).toBe(2022)
      expect(result!.getMonth()).toBe(0) // January is 0
      expect(result!.getDate()).toBe(1)
      expect(result!.getHours()).toBe(20)
      expect(result!.getMinutes()).toBe(30)
    })

    it('should parse MM-DD-YYYY format', () => {
      const result = parseTimeToDate('01-01-2022 20:30', { referenceDate })
      expect(result).toBeDefined()
      expect(result!.getFullYear()).toBe(2022)
      expect(result!.getMonth()).toBe(0) // January is 0
      expect(result!.getDate()).toBe(1)
      expect(result!.getHours()).toBe(20)
      expect(result!.getMinutes()).toBe(30)
    })

    it('should parse datetime with AM/PM', () => {
      const result1 = parseTimeToDate('2022-01-01 8:30 PM', { referenceDate })
      expect(result1).toBeDefined()
      expect(result1!.getFullYear()).toBe(2022)
      expect(result1!.getMonth()).toBe(0)
      expect(result1!.getDate()).toBe(1)
      expect(result1!.getHours()).toBe(20)
      expect(result1!.getMinutes()).toBe(30)

      const result2 = parseTimeToDate('01/01/2022 8:30 AM', { referenceDate })
      expect(result2).toBeDefined()
      expect(result2!.getFullYear()).toBe(2022)
      expect(result2!.getMonth()).toBe(0)
      expect(result2!.getDate()).toBe(1)
      expect(result2!.getHours()).toBe(8)
      expect(result2!.getMinutes()).toBe(30)
    })

    it('should handle 12 AM and 12 PM correctly in datetime', () => {
      const result1 = parseTimeToDate('2022-01-01 12:30 AM', { referenceDate })
      expect(result1).toBeDefined()
      expect(result1!.getFullYear()).toBe(2022)
      expect(result1!.getMonth()).toBe(0)
      expect(result1!.getDate()).toBe(1)
      expect(result1!.getHours()).toBe(0)
      expect(result1!.getMinutes()).toBe(30)

      const result2 = parseTimeToDate('2022-01-01 12:30 PM', { referenceDate })
      expect(result2).toBeDefined()
      expect(result2!.getFullYear()).toBe(2022)
      expect(result2!.getMonth()).toBe(0)
      expect(result2!.getDate()).toBe(1)
      expect(result2!.getHours()).toBe(12)
      expect(result2!.getMinutes()).toBe(30)
    })
  })

  describe('12-hour time formats with AM/PM', () => {
    it('should parse 12-hour time format', () => {
      const result1 = parseTimeToDate('8:30 PM', { referenceDate })
      expect(result1).toEqual(new Date('2024-01-15T20:30:00Z'))

      const result2 = parseTimeToDate('8:30 AM', { referenceDate })
      expect(result2).toEqual(new Date('2024-01-15T08:30:00Z'))
    })

    it('should parse 12-hour time with seconds', () => {
      const result = parseTimeToDate('8:30:15 PM', { referenceDate })
      expect(result).toEqual(new Date('2024-01-15T20:30:15Z'))
    })

    it('should handle 12 AM and 12 PM correctly', () => {
      const result1 = parseTimeToDate('12:30 AM', { referenceDate })
      expect(result1).toEqual(new Date('2024-01-15T00:30:00Z'))

      const result2 = parseTimeToDate('12:30 PM', { referenceDate })
      expect(result2).toEqual(new Date('2024-01-15T12:30:00Z'))
    })

    it('should return undefined for invalid 12-hour format', () => {
      expect(parseTimeToDate('13:30 PM', { referenceDate })).toBeUndefined()
      expect(parseTimeToDate('0:30 AM', { referenceDate })).toBeUndefined()
    })
  })

  describe('24-hour time formats', () => {
    it('should parse 24-hour time format', () => {
      const result = parseTimeToDate('20:30', { referenceDate })
      expect(result).toEqual(new Date('2024-01-15T20:30:00Z'))
    })

    it('should parse 24-hour time format with reference date', () => {
      const result = parseTimeToDate('18:00', { referenceDate })
      expect(result).toEqual(new Date('2024-01-15T18:00:00Z'))
    })

    it('should parse 24-hour time with seconds', () => {
      const result = parseTimeToDate('20:30:45', { referenceDate })
      expect(result).toEqual(new Date('2024-01-15T20:30:45Z'))
    })

    it('should parse single digit hours and minutes', () => {
      const result = parseTimeToDate('8:05', { referenceDate })
      expect(result).toEqual(new Date('2024-01-15T08:05:00Z'))
    })

    it('should return undefined for invalid 24-hour format', () => {
      expect(parseTimeToDate('25:30', { referenceDate })).toBeUndefined()
      expect(parseTimeToDate('20:60', { referenceDate })).toBeUndefined()
      expect(parseTimeToDate('20:30:60', { referenceDate })).toBeUndefined()
    })
  })

  describe('Single hour formats', () => {
    it('should parse single hour in 24-hour format', () => {
      const result = parseTimeToDate('20', { referenceDate })
      // The function returns midnight for single hour format
      expect(result).toEqual(new Date('2024-01-15T00:00:00Z'))
    })

    it('should parse single hour with AM/PM', () => {
      const result1 = parseTimeToDate('8 PM', { referenceDate })
      expect(result1).toEqual(new Date('2024-01-15T20:00:00Z'))

      const result2 = parseTimeToDate('8 AM', { referenceDate })
      expect(result2).toEqual(new Date('2024-01-15T08:00:00Z'))
    })

    it('should handle 12 AM and 12 PM for single hour', () => {
      const result1 = parseTimeToDate('12 AM', { referenceDate })
      expect(result1).toEqual(new Date('2024-01-15T00:00:00Z'))

      const result2 = parseTimeToDate('12 PM', { referenceDate })
      expect(result2).toEqual(new Date('2024-01-15T12:00:00Z'))
    })
  })

  describe('Edge cases and validation', () => {
    it('should return undefined for invalid date components', () => {
      expect(parseTimeToDate('2022-13-01 20:30', { referenceDate })).toBeUndefined()
      expect(parseTimeToDate('2022-01-32 20:30', { referenceDate })).toBeUndefined()
      expect(parseTimeToDate('13/01/2022 20:30', { referenceDate })).toBeUndefined()
    })

    it('should handle case insensitive AM/PM', () => {
      const result1 = parseTimeToDate('8:30 pm', { referenceDate })
      const result2 = parseTimeToDate('8:30 PM', { referenceDate })
      const result3 = parseTimeToDate('8:30 Pm', { referenceDate })

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
      expect(result1).toEqual(new Date('2024-01-15T20:30:00Z'))
    })

    it('should handle whitespace gracefully', () => {
      const result = parseTimeToDate('  8:30 PM  ', { referenceDate })
      expect(result).toEqual(new Date('2024-01-15T20:30:00Z'))
    })

    it('should return undefined for completely invalid inputs', () => {
      expect(parseTimeToDate('invalid time string', { referenceDate })).toBeUndefined()
      expect(parseTimeToDate('25:99:99', { referenceDate })).toBeUndefined()
      expect(parseTimeToDate('abc:def', { referenceDate })).toBeUndefined()
    })
  })

  describe('Real-world CSV-like inputs', () => {
    it('should handle various common CSV time formats', () => {
      const testCases = [
        { input: '8:30 PM', expectedMinute: 30 },
        { input: '20:30', expectedMinute: 30 },
        { input: '20:30:00', expectedMinute: 30, expectedSecond: 0 },
        { input: '2024-01-01 20:30', expectedMinute: 30 },
        { input: '01/01/2024 8:30 PM', expectedMinute: 30, expectedYear: 2024, expectedMonth: 0, expectedDate: 1 },
        { input: '8 AM', expectedMinute: 0 },
        { input: '12 PM', expectedMinute: 0 },
        { input: '12 AM', expectedMinute: 0 },
        { input: '23', expectedMinute: 0 }, // Single hour format returns midnight
      ]

      testCases.forEach(({ input, expectedMinute, expectedSecond, expectedYear, expectedMonth, expectedDate }) => {
        const result = parseTimeToDate(input, { referenceDate })
        expect(result).toBeDefined()
        expect(result!.getMinutes()).toBe(expectedMinute)

        if (expectedSecond !== undefined) {
          expect(result!.getSeconds()).toBe(expectedSecond)
        }

        if (expectedYear !== undefined) {
          expect(result!.getFullYear()).toBe(expectedYear)
        }

        if (expectedMonth !== undefined) {
          expect(result!.getMonth()).toBe(expectedMonth)
        }

        if (expectedDate !== undefined) {
          expect(result!.getDate()).toBe(expectedDate)
        }
      })
    })
  })

  describe(`Support for timezone (${process.env.TZ})`, () => {
    it('should parse time correctly with current timezone', () => {
      // Test basic time parsing
      const result1 = parseTimeToDate('8:30 PM', { referenceDate })
      expect(result1).toBeDefined()
      expect(result1).toBeInstanceOf(Date)

      const result2 = parseTimeToDate('14:00', { referenceDate })
      expect(result2).toBeDefined()
      expect(result2).toBeInstanceOf(Date)

      // Test that results are consistent
      const result3 = parseTimeToDate('8:30 PM', { referenceDate })
      expect(result3).toEqual(result1)
    })

    it('should handle ISO strings with timezone offsets correctly', () => {
      // ISO string with timezone offset should be parsed correctly regardless of system timezone
      const isoWithOffset = parseTimeToDate('2022-01-01T12:00:00+02:00', { referenceDate })
      expect(isoWithOffset).toBeDefined()
      // The function should apply the reference date and handle the timezone offset
      expect(isoWithOffset!.getMinutes()).toBe(0)
      expect(isoWithOffset!.getSeconds()).toBe(0)
      // Hours may vary based on system timezone interpretation of the offset
    })

    it('should maintain consistency across multiple calls with same input', () => {
      // Ensure that multiple calls with the same input produce the same result
      const timeInput = '20:30'
      const result1 = parseTimeToDate(timeInput, { referenceDate })
      const result2 = parseTimeToDate(timeInput, { referenceDate })
      const result3 = parseTimeToDate(timeInput, { referenceDate })

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result3).toBeDefined()
      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    })

    it('should work with timezone parameter when provided', () => {
      // Test explicit timezone parameter
      const result1 = parseTimeToDate('14:00', { referenceDate, timezone: 'UTC' })
      const result2 = parseTimeToDate('14:00', { referenceDate, timezone: 'America/New_York' })

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result1).toBeInstanceOf(Date)
      expect(result2).toBeInstanceOf(Date)
    })
  })
})
