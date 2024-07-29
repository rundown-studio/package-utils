import { Runner, RundownSnapshot, RundownStatus, RundownCueSnapshot, CueType, CueStartMode } from '@rundown-studio/types'
import { randomBytes } from 'crypto'
import { parse } from 'date-fns'

export const getRunnerDefaults = (): Runner => ({
  rundownId: '',
  timesnap: {
    cueId: null,
    running: false,
    kickoff: Date.now(),
    lastStop: Date.now(),
    deadline: Date.now() + (10 * 60000),
  },
  nextCueId: null,
  originalCues: {},
  elapsedCues: {},
  log: [],
})

export const getRundownDefaults = (): RundownSnapshot => ({
  name: '',
  teamId: null,
  eventId: null,
  runnerId: null,
  columns: [],
  cues: [],
  startTime: parse('09:00:00', 'HH:mm:ss', new Date()),
  endTime: parse('10:00:00', 'HH:mm:ss', new Date()),
  salt: randomBytes(16).toString('hex'),
  status: RundownStatus.DRAFT,
  timezone: undefined,
  deletedAt: null,
})

export const getCueDefaults = (): RundownCueSnapshot => ({
  type: CueType.CUE,
  title: '',
  subtitle: '',
  startTime: null,
  startMode: CueStartMode.FLEXIBLE,
  duration: 600000, // 10 min
  backgroundColor: '',
  locked: false,
})
