import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { API_BASE } from './env'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

type UnauthenticatedHandler = () => void
let onUnauthenticated: UnauthenticatedHandler | null = null

export function setOnUnauthenticated(handler: UnauthenticatedHandler | null) {
  onUnauthenticated = handler
}

let refreshPromise: Promise<void> | null = null

async function performRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE}/auth/refresh`, undefined, { withCredentials: true })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false
  return url.startsWith('/auth/') || url.includes(`${API_BASE}/auth/`)
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
    const status = error.response?.status

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      isAuthEndpoint(original.url)
    ) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      await performRefresh()
    } catch (refreshErr) {
      onUnauthenticated?.()
      return Promise.reject(refreshErr)
    }

    return api(original)
  },
)
