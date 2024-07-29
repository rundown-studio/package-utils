import { jest } from '@jest/globals'
import { expect } from 'chai'
import { createTimestamps, getCueDefaults, getRunnerDefaults } from '../dist/esm/index.js'
import _ from 'lodash'
import { addMinutes } from 'date-fns'

/**
 * npm run test -- tests/createTimestamps.test.js
 */

const startTime = new Date('2024-07-26T09:00:00.000Z')
const defaultCues = [
  {
    ...getCueDefaults(),
    id: '#1',
    type: 'cue',
    title: 'Cue 1',
    startTime: startTime,
    duration: 5 * 60000, // 5 min
  },
  {
    ...getCueDefaults(),
    id: '#2',
    type: 'cue',
    title: 'Cue 2',
    startTime: null,
    duration: 10 * 60000, // 10 min
  },
  {
    ...getCueDefaults(),
    id: '#3',
    type: 'cue',
    title: 'Cue 3',
    startTime: null,
    duration: 15 * 60000, // 15 min
  },
]
const defaultCueOrder = [{ id: '#1' }, { id: '#2' }, { id: '#3' },]
const defaultRunner = {
  ...getRunnerDefaults(),
  timesnap: {
    cueId: '#1',
    running: false,
    kickoff: startTime,
    lastStop: startTime,
    deadline: startTime + defaultCues[0].duration,
  },
  nextCueId: '#2',
  originalCues: {
    '#1': _.pick(defaultCues[0], ['startTime', 'duration']),
    '#2': _.pick(defaultCues[1], ['startTime', 'duration']),
    '#3': _.pick(defaultCues[2], ['startTime', 'duration']),
  },
  elapsedCues: {},
}

describe('createTimestamps', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('Default cases', () => {
    it('Not running, runner is null', () => {
      jest.setSystemTime(startTime)
      const cues = defaultCues
      const cueOrder = defaultCueOrder
      const runner = null
      const timestamps = createTimestamps(cues, cueOrder, runner)
      expect(timestamps).to.deep.equal({
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
        ideal: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
        cues: {
          '#1': {
            id: '#1',
            index: 0,
            state: 'CUE_FUTURE',
            original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
            ideal: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
            actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
          },
          '#2': {
            id: '#2',
            index: 1,
            state: 'CUE_FUTURE',
            original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
            ideal: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
            actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
          },
          '#3': {
            id: '#3',
            index: 2,
            state: 'CUE_FUTURE',
            original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
            ideal: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
            actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
          },
        },
      })
    })

    it('Running, first cue went 5m over', () => {
      jest.setSystemTime(addMinutes(startTime, 12))
      const cues = _.cloneDeep(defaultCues)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#2',
        running: true,
        kickoff: addMinutes(startTime, 10),
        lastStop: addMinutes(startTime, 10),
        deadline: addMinutes(startTime, 20),
      }
      runner.nextCueId = '#3'
      runner.elapsedCues['#1'] ={
        startTime: startTime,
        duration: (10 * 60000), // 10 min
      }

      const timestamps = createTimestamps(cues, cueOrder, runner)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 })
      expect(timestamps.ideal).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 35 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        ideal: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        ideal: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        ideal: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 15 * 60000 },
      })
    })
  })
})














