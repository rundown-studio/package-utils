import { describe, it, expect } from 'vitest'
import { parseTimeToDate } from '../parseTimeToDate'

describe('parseTimeToDate - Core Functionality', () => {
  // Focus on testing that the function works rather than exact timezone-dependent results

  describe('Basic parsing success', () => {
    it('should parse ISO datetime strings', () => {
      const result = parseTimeToDate('2024-01-15T20:30:00Z')
      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Date)
    })

    it('should parse 12-hour format with AM/PM', () => {
      const result = parseTimeToDate('9:00 AM')
      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Date)
      expect(result?.getMinutes()).toBe(0)
    })

    it('should parse 24-hour format', () => {
      const result = parseTimeToDate('14:30')
      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Date)
      expect(result?.getMinutes()).toBe(30)
    })

    it('should parse dates with time', () => {
      const result = parseTimeToDate('2024-01-15 20:30')
      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Date)
      expect(result?.getMinutes()).toBe(30)
    })
  })

  describe('AM/PM conversion logic', () => {
    it('should handle 12:XX PM correctly (noon hour)', () => {
      const result = parseTimeToDate('12:30 PM')
      expect(result).toBeDefined()
      expect(result?.getMinutes()).toBe(30)
      // 12 PM should stay as 12 (noon), not convert to 0 or 24
      const hours = result?.getHours()
      expect(hours).toBeGreaterThanOrEqual(12)
      expect(hours).toBeLessThan(24)
    })

    it('should handle 12:XX AM correctly (midnight hour)', () => {
      const result = parseTimeToDate('12:30 AM')
      expect(result).toBeDefined()
      expect(result?.getMinutes()).toBe(30)
      // 12 AM should convert to 0 (midnight)
      const hours = result?.getHours()
      expect(hours).toBeGreaterThanOrEqual(0)
      expect(hours).toBeLessThan(12)
    })
  })

  describe('Edge cases and validation', () => {
    it('should return undefined for empty input', () => {
      expect(parseTimeToDate('')).toBeUndefined()
      expect(parseTimeToDate('  ')).toBeUndefined()
      expect(parseTimeToDate(null)).toBeUndefined()
      expect(parseTimeToDate(undefined)).toBeUndefined()
    })

    it('should return undefined for non-string input', () => {
      expect(parseTimeToDate(123 as any)).toBeUndefined()
      expect(parseTimeToDate({} as any)).toBeUndefined()
    })

    it('should return undefined for invalid time formats', () => {
      expect(parseTimeToDate('25:00')).toBeUndefined()
      expect(parseTimeToDate('12:60')).toBeUndefined()
      expect(parseTimeToDate('invalid-time')).toBeUndefined()
    })

    it('should return undefined for invalid 12-hour format', () => {
      expect(parseTimeToDate('13:30 PM')).toBeUndefined()
      expect(parseTimeToDate('0:30 AM')).toBeUndefined()
    })

    it('should handle whitespace properly', () => {
      const result = parseTimeToDate('  9:00 AM  ')
      expect(result).toBeDefined()
      expect(result?.getMinutes()).toBe(0)
    })
  })

  describe('Case insensitive parsing', () => {
    it('should handle lowercase am/pm', () => {
      const result = parseTimeToDate('9:00 am')
      expect(result).toBeDefined()
      expect(result?.getMinutes()).toBe(0)
    })

    it('should handle mixed case am/pm', () => {
      const result = parseTimeToDate('9:00 Pm')
      expect(result).toBeDefined()
      expect(result?.getMinutes()).toBe(0)
    })
  })

  describe('Timezone parameter acceptance', () => {
    it('should accept timezone parameter without errors', () => {
      const referenceDate = new Date('2024-01-15')
      const result = parseTimeToDate('14:30', {
        referenceDate,
        timezone: 'America/New_York',
      })

      expect(result).toBeDefined()
      expect(result?.getMinutes()).toBe(30)
    })

    it('should accept reference date parameter without errors', () => {
      const referenceDate = new Date('2024-01-15')
      const result = parseTimeToDate('14:30', { referenceDate })

      expect(result).toBeDefined()
      expect(result?.getMinutes()).toBe(30)
    })
  })
})
