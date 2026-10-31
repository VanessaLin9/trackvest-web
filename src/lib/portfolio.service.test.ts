import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { getAssetPerformancePreview } from './asset-performance'
import { portfolioService } from './portfolio.service'
import { queryKeys, resolveAccountScopeKey } from './query-keys'

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
  },
}))

const get = vi.mocked(api.get)

describe('portfolioService.getAssetPerformance', () => {
  const preview = getAssetPerformancePreview()

  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({ data: preview } as never)
  })

  it('calls the live asset-history route without an account scope by default', async () => {
    await expect(portfolioService.getAssetPerformance()).resolves.toEqual(preview)

    expect(get).toHaveBeenCalledWith('/portfolio/performance/assets', {
      params: undefined,
    })
  })

  it('passes owned accountId as a query param and does not send a userId', async () => {
    const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    await portfolioService.getAssetPerformance({ accountId })

    expect(get).toHaveBeenCalledWith('/portfolio/performance/assets', {
      params: { accountId },
    })
    expect(get.mock.calls[0]?.[1]).not.toHaveProperty('userId')
  })
})

describe('asset performance query keys', () => {
  it('nests under portfolio.all so transaction and price writes refetch history', () => {
    const key = queryKeys.portfolio.assetPerformance(
      'user-1',
      resolveAccountScopeKey(undefined),
    )

    expect(queryKeys.portfolio.all()).toEqual(['portfolio'])
    expect(key).toEqual(['portfolio', 'asset-performance', 'user-1', 'all'])
    expect(key.slice(0, 1)).toEqual(queryKeys.portfolio.all())
  })
})
