import { jest } from '@jest/globals'
import { expect } from 'chai'
import { createTimestamps, getCueDefaults, getRunnerDefaults } from '../dist/esm/index.js'
import { CueStartMode } from '@rundown-studio/types'
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
    startTime: null,
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
const defaultCueOrder = [{ id: '#1' }, { id: '#2' }, { id: '#3' }]
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

  describe('Not running, default & control cases, UTC', () => {
    it('Not running, runner is null', () => {
      jest.setSystemTime(startTime)
      const cues = defaultCues
      const cueOrder = defaultCueOrder
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
      })
    })

    it('Not running, runner is null, with locked cue', () => {
      jest.setSystemTime(startTime)
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: addMinutes(startTime, 60), // 10 AM
          startMode: CueStartMode.FIXED,
          duration: 30 * 60000, // 30 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000 },
      })
    })
  })

  describe('Running, different over/under cases, UTC', () => {
    it('First cue went 5min over', () => {
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

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 35 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 15 * 60000 },
      })
    })

    it('Starting 3min late, with locked cue', () => {
      jest.setSystemTime(addMinutes(startTime, 3))
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: addMinutes(startTime, 60), // 10 AM
          startMode: CueStartMode.FIXED,
          duration: 30 * 60000, // 30 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1',
        running: true,
        kickoff: addMinutes(startTime, 3),
        lastStop: addMinutes(startTime, 3),
        deadline: addMinutes(startTime, 8),
      }
      runner.nextCueId = '#2'
      runner.originalCues['#4'] = _.pick(cues[3], ['startTime', 'duration'])

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:03:00.000Z'), duration: 87 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T09:03:00.000Z'), duration: 5 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:08:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:18:00.000Z'), duration: 15 * 60000 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000 },
      })
    })

    it('Running overtime, conflicting with locked cue start', () => {
      jest.setSystemTime(new Date('2024-07-26T09:50:00.000Z'))
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: addMinutes(startTime, 60), // 10 AM
          startMode: CueStartMode.FIXED,
          duration: 30 * 60000, // 30 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#2',
        running: true,
        kickoff: new Date('2024-07-26T09:05:00.000Z'),
        lastStop: new Date('2024-07-26T09:05:00.000Z'),
        deadline: new Date('2024-07-26T09:15:00.000Z'),
      }
      runner.nextCueId = '#3'
      runner.originalCues['#4'] = _.pick(cues[3], ['startTime', 'duration'])
      runner.elapsedCues['#1'] ={
        startTime: new Date('2024-07-26T09:00:00.000Z'),
        duration: (5 * 60000),
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 45 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:50:00.000Z'), duration: 15 * 60000 },
      })
      // Note: There's no notable flag showing the 5m conflict between #3 and #4
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000 },
      })
    })

    it('Started 2m early, went 2m under in #1, fixed by extending #2 by 4m', () => {
      jest.setSystemTime(new Date('2024-07-26T09:05:00.000Z'))
      const cues = _.cloneDeep(defaultCues)
      cues[1].duration = (14 * 60000)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#2',
        running: true,
        kickoff: new Date('2024-07-26T09:01:00.000Z'),
        lastStop: new Date('2024-07-26T09:01:00.000Z'),
        deadline: new Date('2024-07-26T09:15:00.000Z'),
      }
      runner.nextCueId = '#3'
      runner.elapsedCues['#1'] ={
        startTime: new Date('2024-07-26T08:58:00.000Z'),
        duration: (3 * 60000),
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T08:58:00.000Z'), duration: 32 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T08:58:00.000Z'), duration: 3 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:01:00.000Z'), duration: 14 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
      })
    })

    it('Started 2m early, went 2m under in #1, fixed by extending #3 by 4m', () => {
      jest.setSystemTime(new Date('2024-07-26T09:05:00.000Z'))
      const cues = _.cloneDeep(defaultCues)
      cues[2].duration = (19 * 60000)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#2',
        running: true,
        kickoff: new Date('2024-07-26T09:01:00.000Z'),
        lastStop: new Date('2024-07-26T09:01:00.000Z'),
        deadline: new Date('2024-07-26T09:11:00.000Z'),
      }
      runner.nextCueId = '#3'
      runner.elapsedCues['#1'] ={
        startTime: new Date('2024-07-26T08:58:00.000Z'),
        duration: (3 * 60000),
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T08:58:00.000Z'), duration: 32 * 60000 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        actual: { start: new Date('2024-07-26T08:58:00.000Z'), duration: 3 * 60000 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        actual: { start: new Date('2024-07-26T09:01:00.000Z'), duration: 10 * 60000 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        actual: { start: new Date('2024-07-26T09:11:00.000Z'), duration: 19 * 60000 },
      })
    })
  })
})














