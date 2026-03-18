import axios, { AxiosHeaders } from 'axios'
import { API_BASE } from './env'
import { getCurrentUserId } from '../app/current-user'

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const userId = getCurrentUserId()

  if (!userId) {
    return config
  }

  const headers = AxiosHeaders.from(config.headers ?? {})
  if (!headers.has('X-User-Id')) {
    headers.set('X-User-Id', userId)
  }

  config.headers = headers
  return config
})
