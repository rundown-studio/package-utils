import { jest } from '@jest/globals'
import { expect } from 'chai'
import { createTimestamps } from '../dist/esm/index.js'
import { CueStartMode, getCueDefaults, getRunnerDefaults } from '@rundown-studio/types'
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
    '#1': {
      startTime: null,
      startMode: undefined,
      duration: 5 * 60000, // 5 min
    },
    '#2': {
      startTime: null,
      startMode: undefined,
      duration: 10 * 60000, // 10 min
    },
    '#3': {
      startTime: null,
      startMode: undefined,
      duration: 15 * 60000, // 15 min
    },
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

  describe('Not running, default cases, same day UTC', () => {
    it('Not running, PRESHOW', () => {
      jest.setSystemTime(startTime)
      const cues = defaultCues
      const cueOrder = defaultCueOrder
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Not running, ENDED', () => {
      jest.setSystemTime(startTime)
      const cues = defaultCues
      const cueOrder = defaultCueOrder
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: null,
        running: false,
        kickoff: startTime,
        lastStop: startTime,
        deadline: addMinutes(startTime, 15),
      }
      runner.elapsedCues['#3'] = {
        startTime: startTime.toISOString(),
        duration: (15 * 60000), // 15 min
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 15 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 0, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 0, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Not running, PRESHOW, with hard cue', () => {
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

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
      })
    })

    it('Add a cue with `null` duration, should default to 0s', () => {
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
          duration: null,
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 0, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 0, daysPlus: 0 },
      })
    })

    it('Ignore cues not part of cue order', () => {
      jest.setSystemTime(startTime)
      const cues = defaultCues
      const cueOrder = [{ id: '#1' }, { id: '#3' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.equal(undefined)
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Handle cue groups and heading', () => {
      jest.setSystemTime(new Date('2024-07-26T09:00:00.000Z'))
      const cues = [
        {
          ...getCueDefaults(),
          id: '#heading',
          type: 'heading',
          title: 'Heading',
        },
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#group',
          type: 'group',
          title: 'Group',
        },
      ]
      const cueOrder = [
        { id: 'heading' },
        { id: '#1' },
        {
          id: 'group',
          children: [
            { id: '#2' },
            { id: '#3' },
          ],
        },
      ]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })
  })

  describe('Running, different over/under cases, same day UTC', () => {
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
        startTime: startTime.toISOString(),
        duration: (10 * 60000), // 10 min
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 35 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Starting 3min late, with hard cue', () => {
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
      runner.originalCues['#4'] = {
        startTime: addMinutes(startTime, 60).toISOString(),
        startMode: CueStartMode.FIXED,
        duration: 30 * 60000, // 30 min
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:03:00.000Z'), duration: 87 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:03:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:08:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:18:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
      })
    })

    it('Starting 3min late, with hard cue and flexible after', () => {
      jest.setSystemTime(addMinutes(startTime, 3))
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: addMinutes(startTime, 65), // 10:05 AM
          startMode: CueStartMode.FIXED,
          duration: 25 * 60000, // 25 min
        },
        {
          ...getCueDefaults(),
          id: '#5',
          type: 'cue',
          title: 'Cue 5',
          duration: 10 * 60000, // 10 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }, { id: '#5' }]
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1',
        running: true,
        kickoff: addMinutes(startTime, 3),
        lastStop: addMinutes(startTime, 3),
        deadline: addMinutes(startTime, 8),
      }
      runner.nextCueId = '#2'
      runner.originalCues['#4'] = {
        startTime: addMinutes(startTime, 60).toISOString(),
        startMode: CueStartMode.FIXED,
        duration: 30 * 60000, // 30 min
      }
      runner.originalCues['#5'] = {
        duration: 10 * 60000, // 10 min
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 105 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:03:00.000Z'), duration: 97 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:03:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:08:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:18:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:05:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:05:00.000Z'), duration: 25 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#5']).to.deep.equal({
        id: '#5',
        index: 4,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:35:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:30:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
    })

    it('Starting on time, edited cue from flexible to fixed', () => {
      jest.setSystemTime(addMinutes(startTime, 3))
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: addMinutes(startTime, 60), // 10:00 AM
          startMode: CueStartMode.FIXED,
          duration: 20 * 60000, // 20 min
        }
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1',
        running: true,
        kickoff: startTime,
        lastStop: startTime,
        deadline: addMinutes(startTime, 5),
      }
      runner.nextCueId = '#2'
      runner.originalCues['#4'] = {
        startTime: addMinutes(startTime, 30).toISOString(),
        startMode: CueStartMode.FLEXIBLE,
        duration: 20 * 60000,
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 80 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 80 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 20 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 20 * 60000, daysPlus: 0 },
      })
    })

    it('Running overtime, conflicting with hard cue start', () => {
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
      runner.originalCues['#4'] = {
        startTime: addMinutes(startTime, 60).toISOString(),
        startMode: CueStartMode.FIXED,
        duration: 30 * 60000, // 30 min
      }
      runner.elapsedCues['#1'] ={
        startTime: '2024-07-26T09:00:00.000Z',
        duration: (5 * 60000),
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 45 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:50:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      // Note: There's no notable flag showing the 5m conflict between #3 and #4
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
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
        startTime: '2024-07-26T08:58:00.000Z',
        duration: (3 * 60000),
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T08:58:00.000Z'), duration: 32 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T08:58:00.000Z'), duration: 3 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:01:00.000Z'), duration: 14 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
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
        startTime: '2024-07-26T08:58:00.000Z',
        duration: (3 * 60000),
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T08:58:00.000Z'), duration: 32 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T08:58:00.000Z'), duration: 3 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:01:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:11:00.000Z'), duration: 19 * 60000, daysPlus: 0 },
      })
    })

    it('Started 3m late, fixed by shortening #2 by 3m', () => {
      jest.setSystemTime(new Date('2024-07-26T09:05:00.000Z'))
      const cues = _.cloneDeep(defaultCues)
      cues[1].duration = (7 * 60000)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1',
        running: true,
        kickoff: new Date('2024-07-26T09:03:00.000Z'),
        lastStop: new Date('2024-07-26T09:03:00.000Z'),
        deadline: new Date('2024-07-26T09:08:00.000Z'),
      }
      runner.nextCueId = '#2'

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:03:00.000Z'), duration: 27 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:03:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:08:00.000Z'), duration: 7 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Cue inserted after creating runner with original cues, inserted cue is future', () => {
      jest.setSystemTime(new Date('2024-07-26T09:03:00.000Z'))
      const cues = _.cloneDeep(defaultCues)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1',
        running: true,
        kickoff: new Date('2024-07-26T09:00:00.000Z'),
        lastStop: new Date('2024-07-26T09:00:00.000Z'),
        deadline: new Date('2024-07-26T09:05:00.000Z'),
      }
      runner.nextCueId = '#2'
      cues.push({
        ...getCueDefaults(),
        id: '#2b',
        type: 'cue',
        title: 'Cue 2b',
        startTime: null,
        duration: 5 * 60000,
      })
      const cueOrder = [{ id: '#1' }, { id: '#2' }, { id: '#2b' }, { id: '#3' }]

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 35 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 35 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2b']).to.deep.equal({
        id: '#2b',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Cue inserted after creating runner with original cues, inserted cue is active', () => {
      jest.setSystemTime(new Date('2024-07-26T09:08:00.000Z'))
      const cues = _.cloneDeep(defaultCues)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1b',
        running: true,
        kickoff: new Date('2024-07-26T09:05:00.000Z'),
        lastStop: new Date('2024-07-26T09:05:00.000Z'),
        deadline: new Date('2024-07-26T09:10:00.000Z'),
      }
      runner.nextCueId = '#2'
      runner.elapsedCues['#1'] ={
        startTime: '2024-07-26T09:00:00.000Z',
        duration: (5 * 60000),
      }
      cues.push({
        ...getCueDefaults(),
        id: '#1b',
        type: 'cue',
        title: 'Cue 1b',
        startTime: null,
        duration: 5 * 60000,
      })
      const cueOrder = [{ id: '#1' }, { id: '#1b' }, { id: '#2' }, { id: '#3' }]

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 35 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 35 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#1b']).to.deep.equal({
        id: '#1b',
        index: 3,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:10:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })
  })

  describe('Future date in America/Los_Angeles', () => {
    it('Not running, PRESHOW', () => {
      const timezone = 'America/Los_Angeles'
      const now = new Date('2024-08-12T09:00:00.000Z')
      jest.setSystemTime(now)
      const cues = defaultCues
      const cueOrder = defaultCueOrder
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime, { timezone, now })

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Not running, PRESHOW, with hard cue', () => {
      const timezone = 'America/Los_Angeles'
      const now = new Date('2024-08-12T09:10:21.000Z')
      jest.setSystemTime(now)
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: new Date('2024-07-26T10:00:00.000Z'),
          startMode: CueStartMode.FIXED,
          duration: 30 * 60000, // 30 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime, { timezone, now })

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
      })
    })

    it('Running overtime, conflicting with hard cue start', () => {
      const timezone = 'America/Los_Angeles'
      const now = new Date('2024-08-12T09:50:00.000Z')
      jest.setSystemTime(now)
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
        kickoff: new Date('2024-08-12T09:05:00.000Z'),
        lastStop: new Date('2024-08-12T09:05:00.000Z'),
        deadline: new Date('2024-08-12T09:15:00.000Z'),
      }
      runner.nextCueId = '#3'
      runner.originalCues['#4'] = {
        startTime: addMinutes(startTime, 60).toISOString(),
        startMode: CueStartMode.FIXED,
        duration: 30 * 60000, // 30 min
      }
      runner.elapsedCues['#1'] ={
        startTime: '2024-08-12T09:00:00.000Z',
        duration: (5 * 60000),
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime, { timezone, now })

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-08-12T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-08-12T09:00:00.000Z'), duration: 90 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-08-12T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-08-12T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-08-12T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-08-12T09:05:00.000Z'), duration: 45 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-08-12T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-08-12T09:50:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      // Note: There's no notable flag showing the 5m conflict between #3 and #4
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-08-12T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-08-12T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
      })
    })

    it('Spanning multiple days, PRESHOW', () => {
      const timezone = 'America/Los_Angeles'
      const now = new Date('2024-08-12T09:00:00.000Z')
      jest.setSystemTime(now)
      const cues = _.cloneDeep(defaultCues)
      cues[0].duration = 6 * 60 * 60000 // 6h
      cues[1].duration = 10 * 60 * 60000 // 8h
      cues[2].duration = 3 * 60 * 60000 // 3h
      cues[3] = {
        ...getCueDefaults(),
        id: '#4',
        type: 'cue',
        title: 'Cue 4',
        startTime: new Date('2024-07-26T10:00:00.000Z'),
        startDatePlus: 1,
        startMode: CueStartMode.FIXED,
        duration: 3 * 60 * 60000 // 3h
      }
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime, { timezone, now })

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 28 * 60 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 28 * 60 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 6 * 60 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 6 * 60 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T15:00:00.000Z'), duration: 10 * 60 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T15:00:00.000Z'), duration: 10 * 60 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-27T01:00:00.000Z'), duration: 3 * 60 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-27T01:00:00.000Z'), duration: 3 * 60 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-27T10:00:00.000Z'), duration: 3 * 60 * 60000, daysPlus: 1 },
        actual: { start: new Date('2024-07-27T10:00:00.000Z'), duration: 3 * 60 * 60000, daysPlus: 1 },
      })
    })

    it('Spanning multiple days, ONAIR, now is second day', () => {
      const timezone = 'America/Los_Angeles'
      const now = new Date('2024-08-13T10:35:00.000Z')
      jest.setSystemTime(now)
      const cues = _.cloneDeep(defaultCues)
      cues[0].duration = 6 * 60 * 60000 // 6h
      cues[1].duration = 10 * 60 * 60000 // 8h
      cues[2].duration = 3 * 60 * 60000 // 3h
      cues[3] = {
        ...getCueDefaults(),
        id: '#4',
        type: 'cue',
        title: 'Cue 4',
        startTime: new Date('2024-07-26T10:00:00.000Z'),
        startDatePlus: 1,
        startMode: CueStartMode.FIXED,
        duration: 3 * 60 * 60000 // 3h
      }
      const cueOrder = [...defaultCueOrder, { id: '#4' }]
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#4',
        running: true,
        kickoff: new Date('2024-08-13T10:12:00.000Z'),
        lastStop: new Date('2024-08-13T10:12:00.000Z'),
        deadline: new Date('2024-08-13T13:12:00.000Z'),
      }
      runner.nextCueId = null
      runner.originalCues = {
        '#1': {
          startTime: null,
          duration: 6 * 60 * 60000 // 6h
        },
        '#2': {
          startTime: null,
          duration: 10 * 60 * 60000 // 8h
        },
        '#3': {
          startTime: null,
          duration: 3 * 60 * 60000 // 3h
        },
        '#4': {
          startTime: '2024-07-26T10:00:00.000Z',
          startMode: CueStartMode.FIXED,
          duration: 3 * 60 * 60000 // 3h
        },
      }
      runner.elapsedCues = {
        '#1': {
          startTime: '2024-08-12T09:05:00.000Z',
          duration: (6 * 60 * 60000) + (5 * 60000),
        },
        '#2': {
          startTime: '2024-08-12T15:10:00.000Z',
          duration: (10 * 60 * 60000) - (9 * 60000),
        },
        '#3': {
          startTime: '2024-08-13T00:51:00.000Z',
          duration: (3 * 60 * 60000) + (18 * 60000),
        },
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime, { timezone, now })

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-08-12T09:00:00.000Z'), duration: 28 * 60 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-08-12T09:05:00.000Z'), duration: (28 * 60 * 60000) + (12 * 60000) - (5 * 60000), daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-08-12T09:00:00.000Z'), duration: 6 * 60 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-08-12T09:05:00.000Z'), duration: (6 * 60 * 60000) + (5 * 60000), daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_PAST',
        original: { start: new Date('2024-08-12T15:00:00.000Z'), duration: 10 * 60 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-08-12T15:10:00.000Z'), duration: (10 * 60 * 60000) - (9 * 60000), daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_PAST',
        original: { start: new Date('2024-08-13T01:00:00.000Z'), duration: 3 * 60 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-08-13T00:51:00.000Z'), duration: (3 * 60 * 60000) + (18 * 60000), daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-08-13T10:00:00.000Z'), duration: 3 * 60 * 60000, daysPlus: 1 },
        actual: { start: new Date('2024-08-13T10:12:00.000Z'), duration: 3 * 60 * 60000, daysPlus: 1 },
      })
    })

    it('Created before and now is after a DST change, PRESHOW', () => {
      // Daylight Saving Time ends: November 3, 2024 02:00
      const timezone = 'America/Los_Angeles'
      const now = new Date('2024-11-05T10:42:00.000Z')
      jest.setSystemTime(now)
      const cues = defaultCues
      const cueOrder = defaultCueOrder
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime, { timezone, now })

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Created before and started after a DST change, ONAIR', () => {
      // Daylight Saving Time ends: November 3, 2024 02:00
      const timezone = 'America/Los_Angeles'
      const now = new Date('2024-11-05T10:42:00.000Z')
      jest.setSystemTime(now)
      const cues = defaultCues
      const cueOrder = defaultCueOrder
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#3',
        running: true,
        kickoff: new Date('2024-11-05T10:15:00.000Z'),
        lastStop: new Date('2024-11-05T10:15:00.000Z'),
        deadline: new Date('2024-11-05T10:30:00.000Z'),
      }
      runner.nextCueId = null
      runner.elapsedCues = {
        '#1': {
          startTime: '2024-11-05T10:00:00.000Z',
          duration: (5 * 60000),
        },
        '#2': {
          startTime: '2024-11-05T10:05:00.000Z',
          duration: (10 * 60000),
        },
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime, { timezone, now })

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-11-05T10:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-11-05T10:00:00.000Z'), duration: 42 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-11-05T10:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-11-05T10:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_PAST',
        original: { start: new Date('2024-11-05T10:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-11-05T10:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-11-05T10:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-11-05T10:15:00.000Z'), duration: 27 * 60000, daysPlus: 0 },
      })
    })
  })

  describe('Next cue/Jump to cue starting and jumping cases', () => {
    it('Future jump to the past', () => {
      jest.setSystemTime(addMinutes(startTime, 6))
      const cues = _.cloneDeep(defaultCues)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#2',
        running: true,
        kickoff: addMinutes(startTime, 5),
        lastStop: addMinutes(startTime, 5),
        deadline: addMinutes(startTime, 15),
      }
      runner.nextCueId = '#1'
      runner.elapsedCues['#1'] = {
        startTime: startTime.toISOString(),
        duration: (5 * 60000), // 5 min
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Did jump to the past', () => {
      jest.setSystemTime(addMinutes(startTime, 15))
      const cues = _.cloneDeep(defaultCues)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1',
        running: true,
        kickoff: addMinutes(startTime, 15),
        lastStop: addMinutes(startTime, 15),
        deadline: addMinutes(startTime, 20),
      }
      runner.nextCueId = '#2'
      runner.elapsedCues['#1'] = {
        startTime: startTime.toISOString(),
        duration: (5 * 60000), // 5 min
      }
      runner.elapsedCues['#2'] = {
        startTime: addMinutes(startTime, 5).toISOString(),
        duration: (10 * 60000), // 10 min
      }

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:15:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:20:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Jump to the future', () => {
      jest.setSystemTime(addMinutes(startTime, 3))
      const cues = _.cloneDeep(defaultCues)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#1',
        running: true,
        kickoff: startTime,
        lastStop: startTime,
        deadline: addMinutes(startTime, 5),
      }
      runner.nextCueId = '#3'

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_NEXT',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })

    it('Start/Be in the future, all before should be CUE_PAST', () => {
      jest.setSystemTime(addMinutes(startTime, 3))
      const cues = _.cloneDeep(defaultCues)
      const cueOrder = _.cloneDeep(defaultCueOrder)
      const runner = _.cloneDeep(defaultRunner)
      runner.timesnap = {
        cueId: '#3',
        running: true,
        kickoff: startTime,
        lastStop: startTime,
        deadline: addMinutes(startTime, 15),
      }
      runner.nextCueId = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 15 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 0, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_PAST',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 0, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_ACTIVE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
    })
  })

  describe('Multiple day event, using startDatePlus (+1d button)', () => {
    it('Two hours before, keep same day.', () => {
      jest.setSystemTime(startTime)
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: null,
          duration: 120 * 60000, // 120 min (2h)
        },
        {
          ...getCueDefaults(),
          id: '#5',
          type: 'cue',
          title: 'Cue 5',
          startTime: startTime, // 9 AM,
          startMode: CueStartMode.FIXED,
          startDatePlus: 0,
          duration: 20 * 60000, // 20 min
        },
        {
          ...getCueDefaults(),
          id: '#6',
          type: 'cue',
          title: 'Cue 6',
          startTime: null,
          duration: 25 * 60000, // 25 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }, { id: '#5' }, { id: '#6' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 45 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 45 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#5']).to.deep.equal({
        id: '#5',
        index: 4,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 0 },
      })
    })

    it('Two hours before, but with +1 on startDatePlus', () => {
      jest.setSystemTime(startTime)
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: null,
          duration: 120 * 60000, // 120 min (2h)
        },
        {
          ...getCueDefaults(),
          id: '#5',
          type: 'cue',
          title: 'Cue 5',
          startTime: startTime, // 9 AM,
          startMode: CueStartMode.FIXED,
          startDatePlus: 1,
          duration: 20 * 60000, // 20 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }, { id: '#5' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: (24 * 60 + 20) * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: (24 * 60 + 20) * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#5']).to.deep.equal({
        id: '#5',
        index: 4,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-27T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 1 },
        actual: { start: new Date('2024-07-27T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 1 },
      })
    })

    it('Two hours before, but with +1 on startDatePlus, following soft cue', () => {
      jest.setSystemTime(startTime)
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: null,
          duration: 120 * 60000, // 120 min (2h)
        },
        {
          ...getCueDefaults(),
          id: '#5',
          type: 'cue',
          title: 'Cue 5',
          startTime: startTime, // 9 AM,
          startMode: CueStartMode.FIXED,
          startDatePlus: 1,
          duration: 20 * 60000, // 20 min
        },
        {
          ...getCueDefaults(),
          id: '#6',
          type: 'cue',
          title: 'Cue 6',
          startTime: null,
          duration: 25 * 60000, // 25 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }, { id: '#5' }, { id: '#6' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: (24 * 60 + 45) * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: (24 * 60 + 45) * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#5']).to.deep.equal({
        id: '#5',
        index: 4,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-27T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 1 },
        actual: { start: new Date('2024-07-27T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 1 },
      })
      expect(timestamps.cues['#6']).to.deep.equal({
        id: '#6',
        index: 5,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-27T09:20:00.000Z'), duration: 25 * 60000, daysPlus: 1 },
        actual: { start: new Date('2024-07-27T09:20:00.000Z'), duration: 25 * 60000, daysPlus: 1 },
      })
    })

    it('Two hours before, but with +1 on startDatePlus, following soft cue, and hard start back on first day', () => {
      jest.setSystemTime(startTime)
      const cues = [
        ...defaultCues,
        {
          ...getCueDefaults(),
          id: '#4',
          type: 'cue',
          title: 'Cue 4',
          startTime: null,
          duration: 120 * 60000, // 120 min (2h)
        },
        {
          ...getCueDefaults(),
          id: '#5',
          type: 'cue',
          title: 'Cue 5',
          startTime: startTime, // 9 AM,
          startMode: CueStartMode.FIXED,
          startDatePlus: 1,
          duration: 20 * 60000, // 20 min
        },
        {
          ...getCueDefaults(),
          id: '#6',
          type: 'cue',
          title: 'Cue 6',
          startTime: null,
          duration: 25 * 60000, // 25 min
        },
        {
          ...getCueDefaults(),
          id: '#7',
          type: 'cue',
          title: 'Cue 7',
          startTime: startTime, // 9 AM,
          startMode: CueStartMode.FIXED,
          startDatePlus: 0,
          duration: 30 * 60000, // 30 min
        },
      ]
      const cueOrder = [...defaultCueOrder, { id: '#4' }, { id: '#5' }, { id: '#6' }, { id: '#7' }]
      const runner = null

      const timestamps = createTimestamps(cues, cueOrder, runner, startTime)

      expect(timestamps.original).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.actual).to.deep.equal({ start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 })
      expect(timestamps.cues['#1']).to.deep.equal({
        id: '#1',
        index: 0,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#2']).to.deep.equal({
        id: '#2',
        index: 1,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#3']).to.deep.equal({
        id: '#3',
        index: 2,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#4']).to.deep.equal({
        id: '#4',
        index: 3,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:30:00.000Z'), duration: 120 * 60000, daysPlus: 0 },
      })
      expect(timestamps.cues['#5']).to.deep.equal({
        id: '#5',
        index: 4,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-27T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 1 },
        actual: { start: new Date('2024-07-27T09:00:00.000Z'), duration: 20 * 60000, daysPlus: 1 },
      })
      expect(timestamps.cues['#6']).to.deep.equal({
        id: '#6',
        index: 5,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-27T09:20:00.000Z'), duration: 25 * 60000, daysPlus: 1 },
        actual: { start: new Date('2024-07-27T09:20:00.000Z'), duration: 25 * 60000, daysPlus: 1 },
      })
      expect(timestamps.cues['#7']).to.deep.equal({
        id: '#7',
        index: 6,
        state: 'CUE_FUTURE',
        original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
        actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000, daysPlus: 0 },
      })
    })
  })
})
