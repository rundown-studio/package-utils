import { describe, test, expect, afterEach } from 'vitest'
import { epochForScope } from '../epochForScope'
import { TOKEN_EPOCHS } from '../tokenEpochs'

const defaults = { global: TOKEN_EPOCHS.global, teams: { ...TOKEN_EPOCHS.teams }, rundowns: { ...TOKEN_EPOCHS.rundowns } }

afterEach(() => {
  TOKEN_EPOCHS.global = defaults.global
  TOKEN_EPOCHS.teams = { ...defaults.teams }
  TOKEN_EPOCHS.rundowns = { ...defaults.rundowns }
})

describe('epochForScope', () => {
  test('defaults to the global epoch when no specific bumps exist', () => {
    expect(epochForScope('team', 'team-a', null)).toBe(TOKEN_EPOCHS.global)
    expect(epochForScope('rundown', 'team-a', 'rnd-1')).toBe(TOKEN_EPOCHS.global)
  })

  test('a team bump rotates team tokens and that team\'s rundown tokens', () => {
    TOKEN_EPOCHS.teams['team-a'] = 3
    expect(epochForScope('team', 'team-a', null)).toBe(3)
    expect(epochForScope('rundown', 'team-a', 'rnd-1')).toBe(3)
    expect(epochForScope('team', 'team-b', null)).toBe(TOKEN_EPOCHS.global)
  })

  test('a rundown bump rotates only that rundown\'s tokens, not the team scope', () => {
    TOKEN_EPOCHS.rundowns['rnd-1'] = 2
    expect(epochForScope('rundown', 'team-a', 'rnd-1')).toBe(2)
    expect(epochForScope('rundown', 'team-a', 'rnd-2')).toBe(TOKEN_EPOCHS.global)
    expect(epochForScope('team', 'team-a', null)).toBe(TOKEN_EPOCHS.global)
  })

  test('takes the max when global and specific bumps disagree', () => {
    TOKEN_EPOCHS.global = 5
    TOKEN_EPOCHS.teams['team-a'] = 2
    expect(epochForScope('team', 'team-a', null)).toBe(5)
  })

  test('a team token ignores rundown bumps even when a rundownId is passed', () => {
    TOKEN_EPOCHS.rundowns['rnd-1'] = 9
    expect(epochForScope('team', 'team-a', 'rnd-1')).toBe(TOKEN_EPOCHS.global)
  })
})
