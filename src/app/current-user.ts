/**
 * Internal cache of the currently authenticated user's id, kept in sync by
 * AuthProvider. Account and GL writes no longer read it to stamp a body
 * userId; those endpoints take the owner from the session cookie.
 *
 * UI components should use `useAuthenticatedUser()` from `app/use-auth`
 * instead of calling into this module directly.
 */
let currentUserId = ''

export function getCurrentUserId(): string {
  return currentUserId
}

export function getRequiredCurrentUserId(): string {
  if (!currentUserId) {
    throw new Error('Not authenticated')
  }
  return currentUserId
}

export function setCurrentUserId(nextUserId: string): void {
  currentUserId = nextUserId.trim()
}
