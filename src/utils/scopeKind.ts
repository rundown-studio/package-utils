import type { ApiTokenScopeKind } from '@rundown-studio/types'
import { ApiTokenScope } from '@rundown-studio/types'

/**
 * Coarse scope kind of an API token: `team` for the `team_*` scopes, `rundown`
 * for the `rundown_*` scopes.
 *
 * Shared because three call sites must agree on it: mint (functions, stamping a
 * token's scope), the v1 verify path (functions auth), and the realtime read
 * surface (compute-engine auth). Both verify paths use it to resolve the epoch
 * scope and the rundown pin, so a single source is the only way they can't drift.
 */
export function scopeKind(scope: ApiTokenScope): ApiTokenScopeKind {
  switch (scope) {
    case ApiTokenScope.TEAM_OWNER:
    case ApiTokenScope.TEAM_SHOWCALLER:
    case ApiTokenScope.TEAM_EDITOR:
    case ApiTokenScope.TEAM_VIEWER:
      return 'team'
    case ApiTokenScope.RUNDOWN_SHOWCALLER:
    case ApiTokenScope.RUNDOWN_EDITOR:
    case ApiTokenScope.RUNDOWN_VIEWER:
      return 'rundown'
  }
}
