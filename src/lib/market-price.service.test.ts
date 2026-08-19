import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import {
  marketPriceService,
  PriceRefreshResponseError,
} from './market-price.service'

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}))

const post = vi.mocked(api.post)

const successResponse = {
  status: 'success' as const,
  markets: [
    {
      market: 'tw' as const,
      status: 'success' as const,
      startDate: '2026-08-06',
      endDate: '2026-08-19',
      assetsProcessed: 41,
      rowsUpserted: 410,
    },
    {
      market: 'us' as const,
      status: 'success' as const,
      startDate: '2026-08-06',
      endDate: '2026-08-19',
      assetsProcessed: 3,
      rowsUpserted: 27,
    },
  ],
}

describe('marketPriceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to the manual refresh endpoint without a request body', async () => {
    post.mockResolvedValueOnce({ data: successResponse } as never)

    await expect(marketPriceService.refreshPrices()).resolves.toEqual(
      successResponse,
    )
    expect(post).toHaveBeenCalledWith('/prices/refresh')
  })

  it('rejects malformed successful responses before the page can show success', async () => {
    post.mockResolvedValueOnce({
      data: {
        status: 'success',
        markets: [],
      },
    } as never)

    await expect(marketPriceService.refreshPrices()).rejects.toBeInstanceOf(
      PriceRefreshResponseError,
    )
  })

  it('accepts a partial result with one failed market', async () => {
    const response = {
      status: 'partial_success' as const,
      markets: [
        successResponse.markets[0],
        {
          market: 'us' as const,
          status: 'failed' as const,
          errorCode: 'PRICE_REFRESH_FAILED' as const,
          message: 'US price refresh failed',
        },
      ],
    }
    post.mockResolvedValueOnce({ data: response } as never)

    await expect(marketPriceService.refreshPrices()).resolves.toEqual(response)
  })
})
