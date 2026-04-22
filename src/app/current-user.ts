/**
 * Internal cache of the currently authenticated user's id, kept in sync by
 * AuthProvider. Service modules that must include userId in outgoing request
 * bodies (e.g. ownership-checked endpoints) read from this cache.
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
