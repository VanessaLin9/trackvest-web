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
  broker?: string
}

/** 表單載入時保留已存的券商代碼。非 cathay（例如 seed 的 ib）不能被收成空值（PR #26）。 */
export function brokerValueForForm(account: Pick<Account, 'type' | 'broker'>): string {
  if (account.type !== 'broker') {
    return ''
  }

  return account.broker?.trim().toLowerCase() ?? ''
}

/** 空值代表手動帳戶。有值就原樣送出，新建的不支援券商仍由 API 拒絕。 */
export function brokerValueForSave(type: AccountType, broker: string): string | undefined {
  if (type !== 'broker') {
    return undefined
  }

  const normalized = broker.trim().toLowerCase()
  return normalized || undefined
}

/** 新建選項只有空值與 cathay。編輯時若已有其他代碼，多放一個選項讓存檔能送回去。 */
export function brokerSelectOptions(current: string): Array<{ value: string }> {
  const normalized = current.trim().toLowerCase()
  const known = BROKER_OPTIONS.some((option) => option.value === normalized)
  if (!normalized || known) {
    return BROKER_OPTIONS.map((option) => ({ value: option.value }))
  }

  return [...BROKER_OPTIONS.map((option) => ({ value: option.value })), { value: normalized }]
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
