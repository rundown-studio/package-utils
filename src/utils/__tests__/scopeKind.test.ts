import { ApiTokenScope } from '@rundown-studio/types'
import { describe, expect, test } from 'vitest'
import { scopeKind } from '../scopeKind'

describe('scopeKind', () => {
  test('every team_* scope resolves to "team"', () => {
    expect(scopeKind(ApiTokenScope.TEAM_OWNER)).toBe('team')
    expect(scopeKind(ApiTokenScope.TEAM_SHOWCALLER)).toBe('team')
    expect(scopeKind(ApiTokenScope.TEAM_EDITOR)).toBe('team')
    expect(scopeKind(ApiTokenScope.TEAM_VIEWER)).toBe('team')
  })

  test('every rundown_* scope resolves to "rundown"', () => {
    expect(scopeKind(ApiTokenScope.RUNDOWN_SHOWCALLER)).toBe('rundown')
    expect(scopeKind(ApiTokenScope.RUNDOWN_EDITOR)).toBe('rundown')
    expect(scopeKind(ApiTokenScope.RUNDOWN_VIEWER)).toBe('rundown')
  })
})
