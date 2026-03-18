import { api } from './api'
import { getRequiredCurrentUserId } from '../app/current-user'

export type GlAccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export type GlAccount = {
  id: string
  userId: string
  name: string
  type: GlAccountType
  currency: string
  linkedAccountId?: string | null
}

export type GlLine = {
  id: string
  glAccountId: string
  glAccountName?: string
  side: 'debit' | 'credit'
  amount: number
  currency: string
}

export type GlEntry = {
  id: string
  userId: string
  date: string
  memo?: string | null
  source?: string
  refTxId?: string | null
  lines?: GlLine[]
}

type PostExpensePayload = {
  amount: number
  currency: string
  date: string
  memo?: string
  payFromGlAccountId: string
  expenseGlAccountId: string
}

type PostIncomePayload = {
  amount: number
  currency: string
  date: string
  memo?: string
  receiveToGlAccountId: string
  incomeGlAccountId: string
}

type PostTransferPayload = {
  amount: number
  currency: string
  date: string
  memo?: string
  fromGlAccountId: string
  toGlAccountId: string
}

export const cashbookService = {
  /**
   * Get GL accounts by type
   */
  async getGlAccounts(type: GlAccountType): Promise<GlAccount[]> {
    getRequiredCurrentUserId()

    const response = await api.get<GlAccount[]>('/gl/accounts', {
      params: { type },
    })
    return response.data
  },

  /**
   * Get GL entries for a specific account
   */
  async getGlEntries(accountId: string = 'All'): Promise<GlEntry[]> {
    getRequiredCurrentUserId()

    const response = await api.get<GlEntry[]>('/gl/entries', {
      params: { accountId },
    })
    return response.data
  },

  /**
   * Post an expense entry
   */
  async postExpense(payload: PostExpensePayload): Promise<void> {
    const userId = getRequiredCurrentUserId()

    await api.post('/gl/expense', { ...payload, userId })
  },

  /**
   * Post an income entry
   */
  async postIncome(payload: PostIncomePayload): Promise<void> {
    const userId = getRequiredCurrentUserId()

    await api.post('/gl/income', { ...payload, userId })
  },

  /**
   * Post a transfer entry
   */
  async postTransfer(payload: PostTransferPayload): Promise<void> {
    const userId = getRequiredCurrentUserId()

    await api.post('/gl/transfer', { ...payload, userId })
  },
}
