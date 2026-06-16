import { describe, it, expect } from 'vitest'
import { TOKEN_EPOCHS } from '../tokenEpochs'

describe('TOKEN_EPOCHS', () => {
  it('ships with global epoch 0 so pre-epoch tokens (stamped `e: 0`) stay valid', () => {
    // Auth treats a missing `e` claim as 0 and rejects `e < epochForScope(...)`.
    // Bumping the shipped default above 0 silently revokes every token minted
    // before the first deliberate rotation — never change this without one.
    expect(TOKEN_EPOCHS.global).toBe(0)
  })

  it('ships with no team or rundown bumps', () => {
    expect(TOKEN_EPOCHS.teams).toEqual({})
    expect(TOKEN_EPOCHS.rundowns).toEqual({})
  })
})
