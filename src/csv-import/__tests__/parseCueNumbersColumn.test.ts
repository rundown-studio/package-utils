import { describe, it, expect } from 'vitest'
import { parseCueNumbersColumn } from '../parseCueNumbersColumn'

describe('parseCueNumbersColumn', () => {
  describe('Basic normalization', () => {
    it('should normalize sequential numbers', () => {
      const input = {
        0: '1',
        1: '2',
        2: '3',
        3: '4',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '3',
        3: '4',
      })
    })

    it('should normalize chaotic input numbers', () => {
      const input = {
        0: '12',
        1: '64',
        2: '23',
        3: '99',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '3',
        3: '4',
      })
    })

    it('should start with 1 for first cue', () => {
      const input = {
        0: '999',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
      })
    })
  })

  describe('Group handling', () => {
    it('should create groups from dot notation', () => {
      const input = {
        0: '1',
        1: '2',
        2: '3',
        3: '3.1', // Any dot triggers grouping with previous
        4: '3.2',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '3',
        3: '3.1', // Groups with cue 3
        4: '3.2',
      })
    })

    it('should handle chaotic group numbers', () => {
      const input = {
        0: '12',
        1: '64',
        2: '23',
        3: '1.2', // Any dot groups with previous regardless of number
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '3',
        3: '3.1', // Groups with the previous cue (3)
      })
    })

    it('should continue existing groups', () => {
      const input = {
        0: '1',
        1: '2',
        2: '2.1', // Start group
        3: '2.2', // Continue group
        4: '5.9', // Continue group (ignores the 5)
        5: '3', // New main cue
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '2.1',
        3: '2.2',
        4: '2.3', // Continues the group
        5: '3',
      })
    })

    it('should group any dotted value, even non-numeric ones', () => {
      const input = {
        row1: 'foo',
        row2: 'bar.123', // Any dot triggers grouping, regardless of being numeric
        row3: 'baz.456',
        row4: 'qux',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        row1: '1',
        row2: '1.1',
        row3: '1.2',
        row4: '2',
      })
    })

    it('should start new group after regular cue', () => {
      const input = {
        0: '1',
        1: '2',
        2: '2.1', // Group with 2
        3: '3', // New main cue
        4: '3.1', // New group with 3
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '2.1',
        3: '3',
        4: '3.1',
      })
    })
  })

  describe('Complex scenarios', () => {
    it('should handle mixed regular and grouped cues', () => {
      const input = {
        0: '1',
        1: '1.1',
        2: '1.2',
        3: '2',
        4: '3',
        5: '3.1',
        6: '4',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '1.1',
        2: '1.2',
        3: '2',
        4: '3',
        5: '3.1',
        6: '4',
      })
    })

    it('should handle deeply nested groups (ignore 3rd level)', () => {
      const input = {
        0: '1',
        1: '1.1',
        2: '1.2.1', // Should be treated as 1.2
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '1.1',
        2: '1.2', // Third level ignored
      })
    })

    it('should handle empty and whitespace values', () => {
      const input = {
        0: '1',
        1: '',
        2: '  ',
        3: '2.1',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '3',
        3: '3.1', // Groups with previous non-empty (3)
      })
    })

    it('should handle non-string values', () => {
      const input = {
        0: 1,
        1: 2,
        2: null,
        3: undefined,
        4: '3.1',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '2',
        2: '3',
        3: '4',
        4: '4.1', // Groups with previous
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const result = parseCueNumbersColumn({})
      expect(result).toEqual({})
    })

    it('should handle single cue', () => {
      const input = { 0: '999' }
      const result = parseCueNumbersColumn(input)
      expect(result).toEqual({ 0: '1' })
    })

    it('should handle all grouped cues', () => {
      const input = {
        0: '1.1',
        1: '1.2',
        2: '1.3',
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1', // First cue, no previous to group with
        1: '1.1', // Groups with 1
        2: '1.2', // Continues group
      })
    })
  })

  describe('Real-world broadcast scenarios', () => {
    it('should handle typical rundown structure', () => {
      const input = {
        0: '1', // Opening
        1: '1.1', // Welcome
        2: '1.2', // Intro music
        3: '2', // Main segment
        4: '2.1', // Interview pt 1
        5: '2.2', // Interview pt 2
        6: '3', // Commercial break
        7: '4', // Closing segment
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '1.1',
        2: '1.2',
        3: '2',
        4: '2.1',
        5: '2.2',
        6: '3',
        7: '4',
      })
    })

    it('should handle a full CSV-like column with header rows and gaps', () => {
      const input = {
        1: 'Item',
        2: '100',
        3: '101',
        4: '102',
        5: '103',
        6: '104',
        7: '105',
        8: '106',
        9: '107',
        10: '108',
        11: '109',
        12: '110',
        13: '111',
        14: '111.1',
        15: '112',
        16: '112.1',
        17: '',
        18: '',
        19: 'Item',
        20: '113',
        21: '',
        22: '114',
        23: '',
        24: '115',
        25: '',
        26: '116',
        27: '116.1',
        28: '116.2',
        29: '116.3',
        30: '116.4',
        31: '',
        32: '117',
        33: '',
        34: '118',
        35: '119',
        36: '119.1',
        37: '120',
        38: '',
        39: 'Item',
        40: '121',
        41: '122',
        42: '123',
        43: '124',
        44: '',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        1: '1',
        2: '2',
        3: '3',
        4: '4',
        5: '5',
        6: '6',
        7: '7',
        8: '8',
        9: '9',
        10: '10',
        11: '11',
        12: '12',
        13: '13',
        14: '13.1',
        15: '14',
        16: '14.1',
        17: '15',
        18: '16',
        19: '17',
        20: '18',
        21: '19',
        22: '20',
        23: '21',
        24: '22',
        25: '23',
        26: '24',
        27: '24.1',
        28: '24.2',
        29: '24.3',
        30: '24.4',
        31: '25',
        32: '26',
        33: '27',
        34: '28',
        35: '29',
        36: '29.1',
        37: '30',
        38: '31',
        39: '32',
        40: '33',
        41: '34',
        42: '35',
        43: '36',
        44: '37',
      })
    })

    it('should handle user mistakes gracefully', () => {
      const input = {
        0: '1',
        1: '1.5', // User skipped 1.1-1.4
        2: '1.99', // User used weird number
        3: '2', // Back to main sequence
        4: '3.1', // User forgot cue 3, but still groups with previous
        5: '4', // Normal continuation
      }

      const result = parseCueNumbersColumn(input)

      expect(result).toEqual({
        0: '1',
        1: '1.1', // Normalized to proper sequence
        2: '1.2', // Continues sequence
        3: '2',
        4: '2.1', // Creates group with previous cue (2)
        5: '3', // Continues main sequence (not 4)
      })
    })
  })
})
