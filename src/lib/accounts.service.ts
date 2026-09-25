import { api } from './api'

export const ACCOUNT_TYPE_OPTIONS = ['broker', 'bank', 'cash'] as const
export const CURRENCY_OPTIONS = ['TWD', 'USD'] as const
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
    const response = await api.get<Account[]>('/accounts')
    return response.data
  },

  // 擁有者由 API 的 session 決定。body 不帶 userId（PR #26；授權在 trackvest-api PR #46）。
  async createAccount(payload: SaveAccountPayload): Promise<Account> {
    const response = await api.post<Account>('/accounts', payload)
    return response.data
  },

  async updateAccount(id: string, payload: SaveAccountPayload): Promise<Account> {
    const response = await api.patch<Account>(`/accounts/${id}`, payload)
    return response.data
  },
}
