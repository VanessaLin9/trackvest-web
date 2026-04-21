import { createContext } from 'react'
import type { AuthUser, LoginPayload } from '../lib/auth.service'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshSession: () => Promise<AuthUser | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
