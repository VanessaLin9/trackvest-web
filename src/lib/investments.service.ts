import { api } from './api'

export type Account = {
  id: string
  userId: string
  name: string
  type: 'broker' | 'bank' | 'cash'
  currency: string
  createdAt: string
}

export type Asset = {
  id: string
  symbol: string
  name: string
  type: 'equity' | 'etf' | 'crypto' | 'cash'
  baseCurrency: string
}

export type TransactionListItem = {
  id: string
  accountId: string
  assetId?: string | null
  type: 'buy' | 'sell' | 'deposit' | 'withdraw' | 'dividend' | 'fee'
  amount: number | string
  quantity?: number | string | null
  price?: number | string | null
  fee?: number | string | null
  tradeTime: string
  note?: string | null
  isDeleted: boolean
  deletedAt?: string | null
  account?: {
    id: string
    name: string
    currency: string
    userId: string
  }
  asset?: {
    id: string
    symbol: string
    name: string
    baseCurrency: string
  } | null
}

export type TransactionsResponse = {
  total: number
  skip: number
  take: number
  items: TransactionListItem[]
}

export type CreateTransactionPayload = {
  accountId: string
  assetId?: string
  type: 'buy' | 'sell' | 'deposit' | 'dividend'
  amount: number
  quantity?: number
  price?: number
  fee?: number
  tradeTime: string
  note?: string
}

function getHeaders(userId: string) {
  return {
    'X-User-Id': userId,
  }
}

export const investmentsService = {
  async getAccounts(userId: string): Promise<Account[]> {
    const response = await api.get<Account[]>('/accounts', {
      headers: getHeaders(userId),
    })
    return response.data
  },

  async getAssets(): Promise<Asset[]> {
    const response = await api.get<Asset[]>('/assets')
    return response.data
  },

  async getTransactions(
    userId: string,
    params: { accountId?: string; assetId?: string; take?: number } = {},
  ): Promise<TransactionsResponse> {
    const response = await api.get<TransactionsResponse>('/transactions', {
      headers: getHeaders(userId),
      params,
    })
    return response.data
  },

  async createTransaction(
    userId: string,
    payload: CreateTransactionPayload,
  ) {
    const response = await api.post('/transactions', payload, {
      headers: getHeaders(userId),
    })
    return response.data
  },
}
