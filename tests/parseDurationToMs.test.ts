import {describe, it, expect} from 'vitest'
import {parseDurationToMs} from '../src/csv-import/parseDurationToMs'

describe('parseDurationToMs', () => {
  it('should return undefined for undefined input', () => {
    expect(parseDurationToMs()).toBeUndefined()
  })

  it('should return undefined for non-string input', () => {
    expect(parseDurationToMs(123)).toBeUndefined()
    expect(parseDurationToMs({})).toBeUndefined()
    expect(parseDurationToMs([])).toBeUndefined()
  })

  it('should return undefined for empty or whitespace string', () => {
    expect(parseDurationToMs('')).toBeUndefined()
    expect(parseDurationToMs('   ')).toBeUndefined()
  })

  it('should parse HH:MM:SS format correctly', () => {
    expect(parseDurationToMs('01:30:15')).toBe(5415000)
  })

  it('should parse MM:SS format correctly', () => {
    expect(parseDurationToMs('45:20')).toBe(2720000)
  })

  it('should return undefined for invalid colon-separated formats', () => {
    expect(parseDurationToMs('99:99')).toBeUndefined()
    expect(parseDurationToMs('12:60:45')).toBeUndefined()
  })

  it('should parse single quote minute format correctly', () => {
    expect(parseDurationToMs('90\'')).toBe(5400000)
  })

  it('should parse text-based formats with explicit units correctly', () => {
    expect(parseDurationToMs('2 hours 30 minutes 15 seconds')).toBe(9015000)
    expect(parseDurationToMs('1h 15m')).toBe(4500000)
    expect(parseDurationToMs('50 seconds')).toBe(50000)
  })

  it('should return undefined for invalid text-based formats', () => {
    expect(parseDurationToMs('2 minutes 80 seconds')).toBe(200000)
  })

  it('should parse single unit formats correctly', () => {
    expect(parseDurationToMs('5h')).toBe(18000000)
    expect(parseDurationToMs('30m')).toBe(1800000)
    expect(parseDurationToMs('20s')).toBe(20000)
  })

  it('should parse plain number as minutes by default', () => {
    expect(parseDurationToMs('45')).toBe(2700000)
  })

  it('should return undefined for invalid inputs', () => {
    expect(parseDurationToMs('invalid string')).toBeUndefined()
    expect(parseDurationToMs('5x')).toBeUndefined()
    expect(parseDurationToMs('90m60s')).toBe(5460000)
  })

  it('should handle different cases and whitespace gracefully', () => {
    expect(parseDurationToMs('   1h  30M 15S  ')).toBe(5415000)
    expect(parseDurationToMs('2 HOURS')).toBe(7200000)
  })
})
