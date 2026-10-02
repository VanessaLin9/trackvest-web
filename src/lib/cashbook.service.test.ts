import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUserId } from '../app/current-user'
import { api } from './api'
import { cashbookService } from './cashbook.service'

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}))

const post = vi.mocked(api.post)

describe('cashbookService owner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setCurrentUserId('user-should-not-be-sent')
    post.mockResolvedValue({ data: {} } as never)
  })

  it('posts an expense without a body userId', async () => {
    const payload = {
      amount: 320,
      currency: 'TWD',
      date: '2026-01-02',
      payFromGlAccountId: 'cash-gl',
      expenseGlAccountId: 'expense-gl',
    }

    await cashbookService.postExpense(payload)

    expect(post).toHaveBeenCalledWith('/gl/expense', payload)
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('userId')
  })

  it('posts income without a body userId', async () => {
    const payload = {
      amount: 1500,
      currency: 'TWD',
      date: '2026-01-02',
      receiveToGlAccountId: 'cash-gl',
      incomeGlAccountId: 'income-gl',
    }

    await cashbookService.postIncome(payload)

    expect(post).toHaveBeenCalledWith('/gl/income', payload)
  })

  it('posts a transfer without a body userId', async () => {
    const payload = {
      amount: 1000,
      currency: 'TWD',
      date: '2026-01-02',
      fromGlAccountId: 'from-gl',
      toGlAccountId: 'to-gl',
    }

    await cashbookService.postTransfer(payload)

    expect(post).toHaveBeenCalledWith('/gl/transfer', payload)
  })
})
