import { describe, expect, it, vi } from 'vitest'
import { collectTradableAssets, type Asset, type AssetListResponse } from './assets.service'

function asset(id: string, type: Asset['type']): Asset {
  return {
    id,
    symbol: id,
    name: id,
    type,
    assetClass: type === 'cash' ? 'cash' : 'equity',
    baseCurrency: 'TWD',
  }
}

function page(
  items: Asset[],
  total: number,
  pageNumber: number,
  take = 10,
): AssetListResponse {
  return { items, total, page: pageNumber, take }
}

describe('collectTradableAssets', () => {
  it('skips a cash-only first page and keeps tradable rows from the next page', async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 1) {
        return page(
          Array.from({ length: 10 }, (_, index) => asset(`cash-${index}`, 'cash')),
          12,
          1,
        )
      }
      return page([asset('2330', 'equity'), asset('USD', 'cash')], 12, 2)
    })

    await expect(collectTradableAssets(fetchPage)).resolves.toEqual([asset('2330', 'equity')])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('stops once it has a full page of tradable assets', async () => {
    const fetchPage = vi.fn(async () =>
      page(
        Array.from({ length: 10 }, (_, index) => asset(`eq-${index}`, 'equity')),
        40,
        1,
      ),
    )

    const results = await collectTradableAssets(fetchPage)
    expect(results).toHaveLength(10)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
