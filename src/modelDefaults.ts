import { RundownSnapshot, RundownStatus } from '../types'
import { randomBytes } from 'crypto'
import { parse } from 'date-fns'

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
