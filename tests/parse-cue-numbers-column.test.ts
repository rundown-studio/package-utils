import {describe, it, expect} from 'vitest'
import {parseCueNumbersColumn} from '../src/csv-import/parse-cue-numbers-column'

describe('parseCueNumbersColumn', () => {
  describe('Input validation', () => {
    it('should return empty object for empty input', () => {
      expect(parseCueNumbersColumn({})).toEqual({})
    })

    it('should handle all empty/invalid cells', () => {
      const input = {
        row1: '',
        row2: null,
        row3: undefined,
        row4: '   ',
        row5: 'Item',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '2',
        row3: '3',
        row4: '4',
        row5: '5',
      })
    })
  })

  describe('Basic parsing functionality', () => {
    it('should assign sequential numbers for plain values', () => {
      const input = {
        row1: 'foo',
        row2: 'bar',
        row3: 'baz',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '2',
        row3: '3',
      })
    })

    it('should handle numeric and string values', () => {
      const input = {
        row1: 100,
        row2: '101',
        row3: 102,
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '2',
        row3: '3',
      })
    })
  })

  describe('Group/sub-cue handling', () => {
    it('should assign group numbers for consecutive group cells', () => {
      const input = {
        row1: '100',
        row2: '100.1',
        row3: '100.2',
        row4: '101',
        row5: '101.1',
        row6: '102',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '1.1',
        row3: '1.2',
        row4: '2',
        row5: '2.1',
        row6: '3',
      })
    })

    it('should start new group after non-group cell', () => {
      const input = {
        row1: '100',
        row2: '100.1',
        row3: '101',
        row4: '101.1',
        row5: '101.2',
        row6: '102',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '1.1',
        row3: '2',
        row4: '2.1',
        row5: '2.2',
        row6: '3',
      })
    })

    it('should handle non-numeric group values', () => {
      const input = {
        row1: 'foo',
        row2: 'bar.123',
        row3: 'baz.456',
        row4: 'qux',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '1.1',
        row3: '1.2',
        row4: '2',
      })
    })
  })

  describe('Whitespace and formatting', () => {
    it('should trim whitespace and handle group numbers', () => {
      const input = {
        row1: '  100  ',
        row2: ' 100.1 ',
        row3: '\t101\n',
        row4: ' 101.1 ',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '1.1',
        row3: '2',
        row4: '2.1',
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle mixed valid and empty cells', () => {
      const input = {
        row1: '100',
        row2: '',
        row3: '100.1',
        row4: null,
        row5: '101',
      }
      expect(parseCueNumbersColumn(input)).toEqual({
        row1: '1',
        row2: '2',
        row3: '2.1',
        row4: '3',
        row5: '4',
      })
    })

    it('should handle a real-world CSV-like example', () => {
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
  })
})
