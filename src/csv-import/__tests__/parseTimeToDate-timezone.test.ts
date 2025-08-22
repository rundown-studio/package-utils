import { describe, it, expect } from 'vitest'
import { parseTimeToDate } from '../parseTimeToDate'

/**
 * Comprehensive timezone handling tests for parseTimeToDate
 *
 * These tests are designed to validate that the timezone parameter works correctly
 * regardless of what timezone the test environment is running in.
 *
 * IMPORTANT: These tests are expected to FAIL initially because the current
 * implementation doesn't properly handle timezone conversion.
 */
describe('parseTimeToDate - Timezone Handling', () => {
  // Fixed reference date for consistent testing
  const referenceDate = new Date('2024-01-15T10:00:00Z') // Jan 15, 2024, 10:00 UTC

  describe('UTC timezone parsing', () => {
    it('should parse 12-hour format time in UTC timezone', () => {
      const result = parseTimeToDate('8:30 PM', {
        referenceDate,
        timezone: 'UTC',
      })

      expect(result).toBeDefined()

      // When parsing "8:30 PM" with UTC timezone, the result should be:
      // - Date: 2024-01-15 (from referenceDate)
      // - Time: 20:30:00 UTC (8:30 PM in UTC)
      expect(result!.getUTCFullYear()).toBe(2024)
      expect(result!.getUTCMonth()).toBe(0) // January = 0
      expect(result!.getUTCDate()).toBe(15)
      expect(result!.getUTCHours()).toBe(20) // 8 PM = 20:00 in 24-hour
      expect(result!.getUTCMinutes()).toBe(30)
      expect(result!.getUTCSeconds()).toBe(0)
    })

    it('should parse 24-hour format time in UTC timezone', () => {
      const result = parseTimeToDate('20:30', {
        referenceDate,
        timezone: 'UTC',
      })

      expect(result).toBeDefined()

      // When parsing "20:30" with UTC timezone, the result should be:
      // - Date: 2024-01-15 (from referenceDate)
      // - Time: 20:30:00 UTC
      expect(result!.getUTCFullYear()).toBe(2024)
      expect(result!.getUTCMonth()).toBe(0)
      expect(result!.getUTCDate()).toBe(15)
      expect(result!.getUTCHours()).toBe(20)
      expect(result!.getUTCMinutes()).toBe(30)
      expect(result!.getUTCSeconds()).toBe(0)
    })

    it('should parse single hour with AM/PM in UTC timezone', () => {
      const result = parseTimeToDate('8 PM', {
        referenceDate,
        timezone: 'UTC',
      })

      expect(result).toBeDefined()
      expect(result!.getUTCHours()).toBe(20) // 8 PM = 20:00
      expect(result!.getUTCMinutes()).toBe(0)
    })
  })

  describe('America/New_York timezone parsing', () => {
    it('should parse 12-hour format time in New York timezone (EST/EDT)', () => {
      const result = parseTimeToDate('8:30 PM', {
        referenceDate,
        timezone: 'America/New_York',
      })

      expect(result).toBeDefined()

      // When parsing "8:30 PM" in New York timezone on Jan 15, 2024:
      // - Jan 15, 2024 is during EST (UTC-5)
      // - 8:30 PM EST = 1:30 AM UTC the next day
      // - So the UTC time should be 01:30:00 on Jan 16, 2024
      expect(result!.getUTCFullYear()).toBe(2024)
      expect(result!.getUTCMonth()).toBe(0) // January = 0
      expect(result!.getUTCDate()).toBe(16) // Next day in UTC
      expect(result!.getUTCHours()).toBe(1) // 8 PM EST = 1 AM UTC
      expect(result!.getUTCMinutes()).toBe(30)
      expect(result!.getUTCSeconds()).toBe(0)
    })

    it('should parse 24-hour format time in New York timezone', () => {
      const result = parseTimeToDate('20:30', {
        referenceDate,
        timezone: 'America/New_York',
      })

      expect(result).toBeDefined()

      // 20:30 EST = 01:30 UTC the next day
      expect(result!.getUTCHours()).toBe(1)
      expect(result!.getUTCMinutes()).toBe(30)
      expect(result!.getUTCDate()).toBe(16) // Next day in UTC
    })
  })

  describe('Europe/Berlin timezone parsing', () => {
    it('should parse time in Berlin timezone (CET/CEST)', () => {
      const result = parseTimeToDate('8:30 PM', {
        referenceDate,
        timezone: 'Europe/Berlin',
      })

      expect(result).toBeDefined()

      // When parsing "8:30 PM" in Berlin timezone on Jan 15, 2024:
      // - Jan 15, 2024 is during CET (UTC+1)
      // - 8:30 PM CET = 7:30 PM UTC the same day
      expect(result!.getUTCFullYear()).toBe(2024)
      expect(result!.getUTCMonth()).toBe(0)
      expect(result!.getUTCDate()).toBe(15) // Same day in UTC
      expect(result!.getUTCHours()).toBe(19) // 8 PM CET = 7 PM UTC
      expect(result!.getUTCMinutes()).toBe(30)
      expect(result!.getUTCSeconds()).toBe(0)
    })
  })

  describe('Asia/Tokyo timezone parsing', () => {
    it('should parse time in Tokyo timezone (JST)', () => {
      const result = parseTimeToDate('8:30 AM', {
        referenceDate,
        timezone: 'Asia/Tokyo',
      })

      expect(result).toBeDefined()

      // When parsing "8:30 AM" in Tokyo timezone on Jan 15, 2024:
      // - JST is UTC+9 year-round
      // - 8:30 AM JST = 11:30 PM UTC the previous day
      expect(result!.getUTCFullYear()).toBe(2024)
      expect(result!.getUTCMonth()).toBe(0)
      expect(result!.getUTCDate()).toBe(14) // Previous day in UTC
      expect(result!.getUTCHours()).toBe(23) // 8:30 AM JST = 11:30 PM UTC previous day
      expect(result!.getUTCMinutes()).toBe(30)
      expect(result!.getUTCSeconds()).toBe(0)
    })
  })

  describe('Daylight Saving Time handling', () => {
    it('should handle EST (winter time) correctly', () => {
      const winterDate = new Date('2024-01-15T10:00:00Z') // January = EST
      const result = parseTimeToDate('2:00 PM', {
        referenceDate: winterDate,
        timezone: 'America/New_York',
      })

      expect(result).toBeDefined()

      // 2:00 PM EST = 7:00 PM UTC
      expect(result!.getUTCHours()).toBe(19)
      expect(result!.getUTCMinutes()).toBe(0)
    })

    it('should handle EDT (summer time) correctly', () => {
      const summerDate = new Date('2024-07-15T10:00:00Z') // July = EDT
      const result = parseTimeToDate('2:00 PM', {
        referenceDate: summerDate,
        timezone: 'America/New_York',
      })

      expect(result).toBeDefined()

      // 2:00 PM EDT = 6:00 PM UTC
      expect(result!.getUTCHours()).toBe(18)
      expect(result!.getUTCMinutes()).toBe(0)
    })
  })

  describe('Edge cases and validation with timezones', () => {
    it('should handle midnight crossing with timezone conversion', () => {
      const result = parseTimeToDate('11:30 PM', {
        referenceDate,
        timezone: 'America/New_York',
      })

      expect(result).toBeDefined()

      // 11:30 PM EST = 4:30 AM UTC the next day
      expect(result!.getUTCDate()).toBe(16) // Next day
      expect(result!.getUTCHours()).toBe(4)
      expect(result!.getUTCMinutes()).toBe(30)
    })

    it('should handle date boundary crossing in opposite direction', () => {
      const result = parseTimeToDate('1:00 AM', {
        referenceDate,
        timezone: 'Asia/Tokyo',
      })

      expect(result).toBeDefined()

      // 1:00 AM JST = 4:00 PM UTC the previous day
      expect(result!.getUTCDate()).toBe(14) // Previous day
      expect(result!.getUTCHours()).toBe(16)
      expect(result!.getUTCMinutes()).toBe(0)
    })

    it('should work consistently regardless of test environment timezone', () => {
      // This test verifies that the function produces the same result
      // regardless of what timezone the test environment is running in

      const testCases = [
        { input: '10:00 AM', timezone: 'UTC', expectedUTCHour: 10 },
        { input: '10:00 AM', timezone: 'America/New_York', expectedUTCHour: 15 }, // EST: +5
        { input: '10:00 AM', timezone: 'Europe/Berlin', expectedUTCHour: 9 }, // CET: -1
        { input: '10:00 AM', timezone: 'Asia/Tokyo', expectedUTCHour: 1 }, // JST: -9
      ]

      for (const testCase of testCases) {
        const result = parseTimeToDate(testCase.input, {
          referenceDate,
          timezone: testCase.timezone,
        })

        expect(result).toBeDefined()
        expect(result!.getUTCHours()).toBe(testCase.expectedUTCHour)

        // Additional validation that the result is stable
        const result2 = parseTimeToDate(testCase.input, {
          referenceDate,
          timezone: testCase.timezone,
        })
        expect(result!.getTime()).toBe(result2!.getTime())
      }
    })
  })

  describe('No timezone parameter (should use system timezone)', () => {
    it('should parse time without timezone parameter', () => {
      // When no timezone is specified, it should use the system timezone
      // This test documents the current behavior but doesn't assert specific hours
      // since the test environment timezone may vary
      const result = parseTimeToDate('8:30 PM', { referenceDate })

      expect(result).toBeDefined()
      expect(result!.getMinutes()).toBe(30) // Minutes should be consistent

      // The hour will depend on system timezone, so we just verify it's reasonable
      const hour = result!.getHours()
      expect(hour).toBeGreaterThanOrEqual(0)
      expect(hour).toBeLessThan(24)
    })
  })

  describe('Invalid timezone handling', () => {
    it('should throw helpful error for invalid timezone', () => {
      // Should throw a clear error message for invalid timezone
      expect(() => {
        parseTimeToDate('8:30 PM', {
          referenceDate,
          timezone: 'Invalid/Timezone',
        })
      }).toThrow('Invalid timezone "Invalid/Timezone". Please use a valid IANA timezone identifier (e.g., "America/New_York", "Europe/Berlin", "UTC").')
    })
  })
})
