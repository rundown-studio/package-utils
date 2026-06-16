import { TOKEN_EPOCHS } from '@rundown-studio/consts'
import type { ApiTokenScopeKind } from '@rundown-studio/types'

/**
 * Resolve the current epoch for a token scope: the max of the global epoch and
 * any team/rundown-specific bumps in `TOKEN_EPOCHS`.
 *
 * Used identically by mint (stamping the `e` claim) and by auth (comparing it),
 * so the two can never disagree. A `rundown` token answers to whichever is
 * highest of global, its team's bump, and its own rundown's bump; a `team`
 * token ignores rundown bumps. See `@rundown-studio/consts` `TOKEN_EPOCHS` for
 * the rotation model.
 */
export function epochForScope (
  kind: ApiTokenScopeKind,
  teamId: string,
  rundownId: string | null,
): number {
  return Math.max(
    TOKEN_EPOCHS.global,
    TOKEN_EPOCHS.teams[teamId] ?? 0,
    kind === 'rundown' && rundownId ? (TOKEN_EPOCHS.rundowns[rundownId] ?? 0) : 0,
  )
}
