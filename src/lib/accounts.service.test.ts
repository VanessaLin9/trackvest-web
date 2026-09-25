import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUserId } from '../app/current-user'
import { api } from './api'
import { accountsService } from './accounts.service'

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

const post = vi.mocked(api.post)
const patch = vi.mocked(api.patch)

const payload = {
  name: 'Broker TWD',
  type: 'broker' as const,
  currency: 'TWD' as const,
  broker: 'cathay' as const,
}

describe('accountsService owner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setCurrentUserId('user-should-not-be-sent')
    post.mockResolvedValue({ data: { id: 'acc-1' } } as never)
    patch.mockResolvedValue({ data: { id: 'acc-1' } } as never)
  })

  it('creates an account without a body userId', async () => {
    await accountsService.createAccount(payload)

    expect(post).toHaveBeenCalledWith('/accounts', payload)
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('userId')
  })

  it('updates an account without a body userId', async () => {
    await accountsService.updateAccount('acc-1', payload)

    expect(patch).toHaveBeenCalledWith('/accounts/acc-1', payload)
    expect(patch.mock.calls[0]?.[1]).not.toHaveProperty('userId')
  })
})
