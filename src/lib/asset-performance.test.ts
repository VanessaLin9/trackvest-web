import { describe, expect, it } from 'vitest'
import {
  ASSET_PERFORMANCE_PAGE_SIZE,
  filterAssetPerformanceItems,
  getAssetPerformancePreview,
  getAssetPerformanceScenario,
  groupAssetPerformanceByCurrency,
  isDividendUnrecorded,
  paginateItems,
} from './asset-performance'

describe('asset performance fixtures', () => {
  it('keeps closed positions with a true zero unrealized P&L and unrecorded dividends', () => {
    const closed = getAssetPerformanceScenario('closed_without_quote').items[0]

    expect(closed.status).toBe('closed')
    expect(closed.quantity).toBe('0')
    expect(closed.realizedQuantity).toBe('10')
    expect(closed.unrealizedPnl).toBe('0')
    expect(closed.latestPrice).toBeNull()
    expect(closed.recordedDividendAmount).toBeNull()
    expect(closed.recordedDividendCount).toBe(0)
    expect(isDividendUnrecorded(closed)).toBe(true)
  })

  it('keeps missing P&L as null instead of zero', () => {
    const missingFifo = getAssetPerformanceScenario('missing_fifo').items[0]
    const zeroPnl = getAssetPerformanceScenario('zero_pnl').items[0]

    expect(missingFifo.realizedQuantity).toBeNull()
    expect(missingFifo.realizedNetPnl).toBeNull()
    expect(missingFifo.tradeNetPnl).toBeNull()
    expect(missingFifo.issues).toEqual(['MISSING_FIFO'])
    expect(zeroPnl.realizedQuantity).toBe('0')
    expect(zeroPnl.realizedNetPnl).toBe('0')
    expect(zeroPnl.tradeNetPnl).toBe('0')
    expect(zeroPnl.issues).toEqual([])
  })

  it('keeps the same asset in separate original-currency rows', () => {
    const grouped = groupAssetPerformanceByCurrency(
      getAssetPerformanceScenario('same_asset_different_currencies').items,
    )

    expect(grouped.map((group) => group.currency)).toEqual(['TWD', 'USD'])
    expect(grouped[0].items[0].symbol).toBe('AAPL')
    expect(grouped[1].items[0].symbol).toBe('AAPL')
    expect(grouped[0].items[0].assetId).toBe(grouped[1].items[0].assetId)
  })

  it('composes a CP2 preview without colliding identity keys', () => {
    const preview = getAssetPerformancePreview()
    const keys = preview.items.map((item) => `${item.assetId}:${item.currency}`)

    expect(new Set(keys).size).toBe(keys.length)
    expect(preview.items.map((item) => item.symbol)).toEqual([
      '0050',
      '2330',
      'AAPL',
      'AAPL',
    ])
  })
})

describe('asset performance client filtering', () => {
  const previewItems = getAssetPerformancePreview().items

  it('filters by holding / closed without changing the original list', () => {
    expect(
      filterAssetPerformanceItems(previewItems, { status: 'closed', query: '' }).map(
        (item) => item.symbol,
      ),
    ).toEqual(['2330'])
    expect(
      filterAssetPerformanceItems(previewItems, { status: 'holding', query: '' }).map(
        (item) => item.symbol,
      ),
    ).toEqual(['0050', 'AAPL', 'AAPL'])
    expect(previewItems).toHaveLength(4)
  })

  it('searches symbol and name', () => {
    expect(
      filterAssetPerformanceItems(previewItems, { status: 'all', query: 'apple' }).map(
        (item) => item.currency,
      ),
    ).toEqual(['TWD', 'USD'])
    expect(
      filterAssetPerformanceItems(previewItems, { status: 'all', query: '0050' }),
    ).toHaveLength(1)
  })

  it('paginates 20 rows at a time', () => {
    const many = Array.from({ length: 21 }, (_, index) => ({
      ...previewItems[0],
      assetId: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
      symbol: `S${String(index).padStart(2, '0')}`,
    }))
    const firstPage = paginateItems(many, 1)
    const secondPage = paginateItems(many, 2)

    expect(ASSET_PERFORMANCE_PAGE_SIZE).toBe(20)
    expect(firstPage.items).toHaveLength(20)
    expect(secondPage.items).toHaveLength(1)
    expect(firstPage.totalPages).toBe(2)
  })
})
