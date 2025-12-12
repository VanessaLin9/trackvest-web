import { api } from './api'

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
  userId: string
  amount: number
  currency: string
  date: string
  memo?: string
  payFromGlAccountId: string
  expenseGlAccountId: string
}

type PostIncomePayload = {
  userId: string
  amount: number
  currency: string
  date: string
  memo?: string
  receiveToGlAccountId: string
  incomeGlAccountId: string
}

function getHeaders(userId: string) {
  return {
    'X-User-Id': userId,
  }
}

export const cashbookService = {
  /**
   * Get GL accounts by type
   */
  async getGlAccounts(userId: string, type: GlAccountType): Promise<GlAccount[]> {
    const response = await api.get<GlAccount[]>('/gl/accounts', {
      headers: getHeaders(userId),
      params: { userId, type },
    })
    return response.data
  },

  /**
   * Get GL entries for a specific account
   */
  async getGlEntries(userId: string, accountId: string = 'All'): Promise<GlEntry[]> {
    const response = await api.get<GlEntry[]>('/gl/entries', {
      headers: getHeaders(userId),
      params: { accountId },
    })
    return response.data
  },

  /**
   * Post an expense entry
   */
  async postExpense(payload: PostExpensePayload): Promise<void> {
    await api.post('/gl/expense', payload, {
      headers: getHeaders(payload.userId),
    })
  },

  /**
   * Post an income entry
   */
  async postIncome(payload: PostIncomePayload): Promise<void> {
    await api.post('/gl/income', payload, {
      headers: getHeaders(payload.userId),
    })
  },
}

