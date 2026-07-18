import { api } from './api'
import type { Account } from './accounts.service'
import type { Asset, AssetListResponse } from './assets.service'

export type { Asset } from './assets.service'

export type TransactionListItem = {
  id: string
  accountId: string
  assetId?: string | null
  type: 'buy' | 'sell' | 'deposit' | 'withdraw' | 'dividend' | 'fee'
  amount: number | string
  quantity?: number | string | null
  price?: number | string | null
  fee?: number | string | null
  tax?: number | string | null
  brokerOrderNo?: string | null
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
  tax?: number
  brokerOrderNo?: string
  tradeTime: string
  note?: string
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>

export type ImportTransactionsPayload = {
  accountId: string
  csvContent: string
}

export type ImportRowIssue = {
  code: string
  field: string
  message: string
}

export type ImportPreviewNormalizedTransaction = {
  type: 'buy' | 'sell'
  quantity: string
  unitPrice: string
  currency: string
  fees: string
  taxes: string
}

export type ImportResolvedAsset = {
  id: string
  symbol: string
  name: string
}

export const IMPORT_ERROR_CODES = {
  ASSET_ALIAS_NOT_FOUND: 'ASSET_ALIAS_NOT_FOUND',
} as const

export type ImportPreviewRow = {
  row: number
  status: 'ready' | 'skipped' | 'error' | 'warning'
  rawAssetName: string
  brokerOrderNo: string
  tradeDate: string
  resolvedAsset: ImportResolvedAsset | null
  normalizedTransaction: ImportPreviewNormalizedTransaction | null
  errors: ImportRowIssue[]
  warnings: ImportRowIssue[]
}

export type ImportPreviewResponse = {
  totalRows: number
  readyCount: number
  skippedCount: number
  errorCount: number
  warningCount: number
  canCommit: boolean
  writeOrderRowNumbers: number[]
  rows: ImportPreviewRow[]
}

export type ImportCommitResponse = {
  totalRows: number
  successCount: number
  skippedCount: number
  failureCount: number
  createdTransactionIds: string[]
}

export type ImportCommitRejectedResponse = {
  totalRows: number
  successCount: number
  skippedCount: number
  failureCount: number
  errorCode: string
  createdTransactionIds: string[]
  preview: ImportPreviewResponse
}

export const investmentsService = {
  async getAccounts(): Promise<Account[]> {
    const response = await api.get<Account[]>('/accounts')
    return response.data
  },

  async getAssets(): Promise<Asset[]> {
    const response = await api.get<AssetListResponse>('/assets', {
      params: {
        page: 1,
        take: 100,
      },
    })
    return response.data.items
  },

  async getTransactions(
    params: { accountId?: string; assetId?: string; take?: number } = {},
  ): Promise<TransactionsResponse> {
    const response = await api.get<TransactionsResponse>('/transactions', { params })
    return response.data
  },

  async createTransaction(payload: CreateTransactionPayload) {
    const response = await api.post<TransactionListItem>('/transactions', payload)
    return response.data
  },

  async updateTransaction(id: string, payload: UpdateTransactionPayload) {
    const response = await api.patch<TransactionListItem>(`/transactions/${id}`, payload)
    return response.data
  },

  async removeTransaction(id: string) {
    const response = await api.delete<TransactionListItem>(`/transactions/${id}`)
    return response.data
  },

  async previewImportTransactions(
    payload: ImportTransactionsPayload,
  ): Promise<ImportPreviewResponse> {
    const response = await api.post<ImportPreviewResponse>(
      '/transactions/import/preview',
      payload,
    )
    return response.data
  },

  async commitImportTransactions(
    payload: ImportTransactionsPayload,
  ): Promise<ImportCommitResponse> {
    const response = await api.post<ImportCommitResponse>(
      '/transactions/import/commit',
      payload,
    )
    return response.data
  },
}
