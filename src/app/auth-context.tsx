import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './auth-context-base'
import { authService, type AuthUser, type LoginPayload } from '../lib/auth.service'
import { setOnUnauthenticated } from '../lib/api'
import { setCurrentUserId } from './current-user'

export interface AuthProviderProps {
  children: ReactNode
  /**
   * Optional override for the initial user, primarily used by tests to skip
   * the bootstrap `/auth/me` call.
   */
  initialUser?: AuthUser | null
  /**
   * When true, skip the bootstrap call to `/auth/me`. Defaults to false.
   */
  skipBootstrap?: boolean
}

export function AuthProvider({
  children,
  initialUser,
  skipBootstrap,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    setCurrentUserId(initialUser?.id ?? '')
    return initialUser ?? null
  })
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (initialUser) return 'authenticated'
    if (skipBootstrap) return 'unauthenticated'
    return 'loading'
  })

  useEffect(() => {
    setCurrentUserId(user?.id ?? '')
  }, [user])

  useEffect(() => {
    if (initialUser || skipBootstrap) return

    let cancelled = false
    authService
      .me()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [initialUser, skipBootstrap])

  const login = useCallback(async (payload: LoginPayload) => {
    const authenticated = await authService.login(payload)
    setUser(authenticated)
    setStatus('authenticated')
    return authenticated
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const me = await authService.me()
      setUser(me)
      setStatus('authenticated')
      return me
    } catch {
      setUser(null)
      setStatus('unauthenticated')
      return null
    }
  }, [])

  useEffect(() => {
    setOnUnauthenticated(() => {
      setUser(null)
      setStatus('unauthenticated')
    })
    return () => {
      setOnUnauthenticated(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, refreshSession }),
    [status, user, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
