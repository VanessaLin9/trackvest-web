import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './auth-context-base'
import type { AuthUser } from '../lib/auth.service'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

/**
 * Returns the currently authenticated user. Intended to be called from
 * components that live behind a ProtectedRoute, where `user` is guaranteed
 * to be present.
 */
export function useAuthenticatedUser(): AuthUser {
  const { user } = useAuth()
  if (!user) {
    throw new Error(
      'useAuthenticatedUser called outside an authenticated context',
    )
  }
  return user
}
