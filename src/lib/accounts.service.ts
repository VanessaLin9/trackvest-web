import { api } from './api'
import { getRequiredCurrentUserId } from '../app/current-user'

export const ACCOUNT_TYPE_OPTIONS = ['broker', 'bank', 'cash'] as const
export const CURRENCY_OPTIONS = ['TWD', 'USD', 'JPY', 'EUR'] as const
export const BROKER_OPTIONS = [
  { value: '', label: 'None (manual only)' },
  { value: 'cathay', label: 'Cathay' },
] as const
export const SUPPORTED_BROKER = 'cathay'

export type AccountType = (typeof ACCOUNT_TYPE_OPTIONS)[number]
export type Currency = (typeof CURRENCY_OPTIONS)[number]
export type Broker = (typeof BROKER_OPTIONS)[number]['value']

export type Account = {
  id: string
  userId: string
  name: string
  type: AccountType
  currency: Currency
  broker?: string | null
  createdAt: string
}

export type SaveAccountPayload = {
  name: string
  type: AccountType
  currency: Currency
  broker?: Broker
}

export const accountsService = {
  async getAccounts(): Promise<Account[]> {
    getRequiredCurrentUserId()

    const response = await api.get<Account[]>('/accounts')
    return response.data
  },

  async createAccount(payload: SaveAccountPayload): Promise<Account> {
    const userId = getRequiredCurrentUserId()

    const response = await api.post<Account>('/accounts', {
      ...payload,
      userId,
    })
    return response.data
  },

  async updateAccount(id: string, payload: SaveAccountPayload): Promise<Account> {
    const userId = getRequiredCurrentUserId()

    const response = await api.patch<Account>(`/accounts/${id}`, {
      ...payload,
      userId,
    })
    return response.data
  },
}
