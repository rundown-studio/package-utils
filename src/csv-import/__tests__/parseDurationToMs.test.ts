import { describe, it, expect } from 'vitest'
import { parseDurationToMs } from '../parseDurationToMs'

describe('parseDurationToMs', () => {
  describe('Colon-separated formats', () => {
    it('should parse HH:MM format', () => {
      expect(parseDurationToMs('1:30')).toBe(5400000) // 1h 30m
      expect(parseDurationToMs('5:45')).toBe(20700000) // 5h 45m
      expect(parseDurationToMs('0:30')).toBe(1800000) // 30m
    })

    it('should parse HH:MM:SS format', () => {
      expect(parseDurationToMs('1:30:45')).toBe(5445000) // 1h 30m 45s
      expect(parseDurationToMs('2:15:30')).toBe(8130000) // 2h 15m 30s
      expect(parseDurationToMs('0:05:30')).toBe(330000) // 5m 30s
    })

    it('should handle single digit values', () => {
      expect(parseDurationToMs('1:5')).toBe(3900000) // 1h 5m
      expect(parseDurationToMs('1:5:3')).toBe(3903000) // 1h 5m 3s
    })

    it('should validate time values', () => {
      expect(parseDurationToMs('1:60')).toBeUndefined() // Invalid: 60 minutes
      expect(parseDurationToMs('1:30:60')).toBeUndefined() // Invalid seconds
      expect(parseDurationToMs('25:30:45')).toBeDefined() // Hours can be > 24
    })
  })

  describe('Single quote notation', () => {
    it('should parse minutes with single quote', () => {
      expect(parseDurationToMs('90\'')).toBe(5400000) // 90 minutes
      expect(parseDurationToMs('5\'')).toBe(300000) // 5 minutes
      expect(parseDurationToMs('120\'')).toBe(7200000) // 120 minutes
    })

    it('should handle whitespace around single quote', () => {
      expect(parseDurationToMs('90 \'')).toBeUndefined() // Space before quote should fail
      expect(parseDurationToMs('90\'  ')).toBe(5400000) // Space after quote is trimmed
    })
  })

  describe('Text-based formats with units', () => {
    it('should parse hours, minutes, and seconds', () => {
      expect(parseDurationToMs('1h 30m 45s')).toBe(5445000)
      expect(parseDurationToMs('2 hours 15 minutes 30 seconds')).toBe(8130000)
      expect(parseDurationToMs('1hr 20min 10sec')).toBe(4810000)
    })

    it('should parse individual units', () => {
      expect(parseDurationToMs('2 hours')).toBe(7200000)
      expect(parseDurationToMs('30 minutes')).toBe(1800000)
      expect(parseDurationToMs('45 seconds')).toBe(45000)
    })

    it('should parse abbreviated units', () => {
      expect(parseDurationToMs('2h')).toBe(7200000)
      expect(parseDurationToMs('30m')).toBe(1800000)
      expect(parseDurationToMs('45s')).toBe(45000)
    })

    it('should handle mixed formats', () => {
      expect(parseDurationToMs('1h 30m')).toBe(5400000)
      expect(parseDurationToMs('2 hours 30s')).toBe(7230000)
      expect(parseDurationToMs('90m 15s')).toBe(5415000)
    })

    it('should be case insensitive', () => {
      expect(parseDurationToMs('1H 30M 45S')).toBe(5445000)
      expect(parseDurationToMs('2 HOURS 15 MINUTES')).toBe(8100000)
    })

    it('should handle various spacing', () => {
      expect(parseDurationToMs('1h30m45s')).toBe(5445000)
      expect(parseDurationToMs('1 h 30 m 45 s')).toBe(5445000)
      expect(parseDurationToMs('  1h  30m  45s  ')).toBe(5445000)
    })
  })

  describe('Single unit formats', () => {
    it('should parse single hours', () => {
      expect(parseDurationToMs('2h')).toBe(7200000)
      expect(parseDurationToMs('24h')).toBe(86400000)
    })

    it('should parse single minutes', () => {
      expect(parseDurationToMs('30m')).toBe(1800000)
      expect(parseDurationToMs('90m')).toBe(5400000)
    })

    it('should parse single seconds', () => {
      expect(parseDurationToMs('45s')).toBe(45000)
      expect(parseDurationToMs('120s')).toBe(120000)
    })
  })

  describe('Plain number format', () => {
    it('should treat plain numbers as minutes', () => {
      expect(parseDurationToMs('90')).toBe(5400000) // 90 minutes
      expect(parseDurationToMs('5')).toBe(300000) // 5 minutes
      expect(parseDurationToMs('120')).toBe(7200000) // 120 minutes
    })

    it('should handle leading zeros', () => {
      expect(parseDurationToMs('05')).toBe(300000) // 5 minutes
      expect(parseDurationToMs('090')).toBe(5400000) // 90 minutes
    })
  })

  describe('Edge cases and validation', () => {
    it('should return undefined for empty or null input', () => {
      expect(parseDurationToMs('')).toBeUndefined()
      expect(parseDurationToMs('  ')).toBeUndefined()
      expect(parseDurationToMs(null as any)).toBeUndefined()
      expect(parseDurationToMs(undefined)).toBeUndefined()
    })

    it('should return undefined for non-string input', () => {
      expect(parseDurationToMs(123 as any)).toBeUndefined()
      expect(parseDurationToMs({} as any)).toBeUndefined()
      expect(parseDurationToMs([] as any)).toBeUndefined()
    })

    it('should return undefined for invalid formats', () => {
      expect(parseDurationToMs('invalid')).toBeUndefined()
      expect(parseDurationToMs('1:2:3:4')).toBeUndefined() // Too many colons
      expect(parseDurationToMs('1x2y3z')).toBeUndefined() // Invalid units
    })

    it('should handle zero values', () => {
      expect(parseDurationToMs('0:00')).toBe(0) // 0h 0m
      expect(parseDurationToMs('0h 0m 0s')).toBe(0)
      expect(parseDurationToMs('0')).toBe(0)
    })
  })

  describe('Real-world examples', () => {
    it('should handle common broadcast durations', () => {
      expect(parseDurationToMs('0:30')).toBe(1800000) // 30 minutes
      expect(parseDurationToMs('1:00')).toBe(3600000) // 1 hour
      expect(parseDurationToMs('2:30')).toBe(9000000) // 2h 30m
      expect(parseDurationToMs('30:00')).toBe(108000000) // 30 hours
      expect(parseDurationToMs('1:30:00')).toBe(5400000) // 1h 30m 0s
    })

    it('should handle various user input styles', () => {
      expect(parseDurationToMs('90')).toBe(5400000) // User types "90" meaning 90 minutes
      expect(parseDurationToMs('90\'')).toBe(5400000) // User types "90'"
      expect(parseDurationToMs('1 min 32 sec')).toBe(92000) // Verbose format
      expect(parseDurationToMs('1m 32s')).toBe(92000) // Short format
    })
  })
})
