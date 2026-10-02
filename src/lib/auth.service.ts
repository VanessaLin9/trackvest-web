import { api } from './api'
import type { ApiSchemas } from './api-schema'

/** 與 API `UserRole` 相同：`user` / `admin`。不是 `USER` / `ADMIN`（PR #26）。 */
export type AuthUser = ApiSchemas['AuthUserDto']
export type AuthUserRole = AuthUser['role']

export interface LoginPayload {
  email: string
  password: string
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    const response = await api.post<AuthUser>('/auth/login', payload)
    return response.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async me(): Promise<AuthUser> {
    const response = await api.get<AuthUser>('/auth/me')
    return response.data
  },

  async refresh(): Promise<void> {
    await api.post('/auth/refresh')
  },
}
