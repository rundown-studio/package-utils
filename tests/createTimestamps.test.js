import { expect } from 'chai'
import { createTimestamps, getCueDefaults } from '../dist/esm/index.js'

const startTime = new Date('2024-07-26T09:00:00.000Z')
// const endTime = new Date('2024-07-26T09:30:00.000Z')
const defaultCues = [
  {
    ...getCueDefaults(),
    id: '#1',
    type: 'cue',
    title: 'Cue 1',
    startTime: null,
    duration: 10 * 60 * 1000, // 10 min
  },
  {
    ...getCueDefaults(),
    id: '#2',
    type: 'cue',
    title: 'Cue 2',
    startTime: null,
    duration: 5 * 60 * 1000, // 5 min
  },
  {
    ...getCueDefaults(),
    id: '#3',
    type: 'cue',
    title: 'Cue 3',
    startTime: null,
    duration: 15 * 60 * 1000, // 15 min
  },
]

describe('createTimestamps', () => {
  describe('1: Default, not running', () => {
    const cues = [...defaultCues]
    const runner = null

    it('handles the default case correctly', () => {
      const timestamps = createTimestamps(startTime, cues, runner)
      expect(timestamps).to.deep.equal({
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
        planned: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
        cues: {
          '#1': {
            id: '#1',
            index: 0,
            state: 'CUE_FUTURE',
            original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 10 * 60000 },
            planned: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 10 * 60000 },
            actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 10 * 60000 },
          },
          '#2': {
            id: '#2',
            index: 1,
            state: 'CUE_FUTURE',
            original: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 5 * 60000 },
            planned: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 5 * 60000 },
            actual: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 5 * 60000 },
          },
          '#3': {
            id: '#3',
            index: 2,
            state: 'CUE_FUTURE',
            original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
            planned: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
            actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
          },
        },
      })
    })
  })
})
