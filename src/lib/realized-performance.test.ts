import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { portfolioService } from './portfolio.service'
import { queryKeys } from './query-keys'

vi.mock('./api', () => ({ api: { get: vi.fn() } }))
const get = vi.mocked(api.get)

beforeEach(() => { vi.clearAllMocks() })

describe('realized period API contract', () => {
  const accountId = '11111111-1111-4111-8111-111111111111'

  it('passes all period and paging scopes without transforming financial responses', async () => {
    const response = { summary: { realizedNetPnl: null, netProceeds: '1000000000.00000001' } }
    get.mockResolvedValue({ data: response })
    const periods = { year: 2024, accountId }
    const assets = { ...periods, month: 3, currency: 'USD', skip: 20, take: 20 }
    const trades = { ...assets, assetId: '22222222-2222-4222-8222-222222222222' }
    expect(await portfolioService.getRealizedPeriods(periods)).toBe(response)
    expect(get).toHaveBeenLastCalledWith('/portfolio/performance/realized/periods', { params: periods })
    expect(await portfolioService.getRealizedAssets(assets)).toBe(response)
    expect(get).toHaveBeenLastCalledWith('/portfolio/performance/realized/assets', { params: assets })
    expect(await portfolioService.getRealizedTrades(trades)).toBe(response)
    expect(get).toHaveBeenLastCalledWith('/portfolio/performance/realized/trades', { params: trades })
  })

  it('propagates request failures instead of returning fake or empty results', async () => {
    get.mockRejectedValue(new Error('403'))
    await expect(portfolioService.getRealizedPeriods({ year: 2024 })).rejects.toThrow('403')
    await expect(portfolioService.getRealizedAssets({ year: 2024, currency: 'TWD' })).rejects.toThrow('403')
    await expect(portfolioService.getRealizedTrades({ year: 2024, currency: 'TWD', assetId: 'asset-id' })).rejects.toThrow('403')
  })

  it('isolates users, periods, currencies, accounts, assets and pages under portfolio invalidation', () => {
    const period = { year: 2024, accountId }
    const assets = { ...period, month: 3, currency: 'TWD', skip: 0, take: 20 }
    const trades = { ...assets, assetId: 'asset-1' }
    const periodKey = queryKeys.portfolio.realizedPeriods('user-1', period)
    const assetsKey = queryKeys.portfolio.realizedAssets('user-1', assets)
    const tradesKey = queryKeys.portfolio.realizedTrades('user-1', trades)
    for (const key of [periodKey, assetsKey, tradesKey]) expect(key.slice(0, 1)).toEqual(queryKeys.portfolio.all())
    expect(periodKey).not.toEqual(queryKeys.portfolio.realizedPeriods('user-2', period))
    expect(periodKey).not.toEqual(queryKeys.portfolio.realizedPeriods('user-1', { year: 2025 }))
    for (const patch of [{ month: 4 }, { currency: 'USD' }, { skip: 20 }, { accountId: undefined }]) {
      expect(assetsKey).not.toEqual(queryKeys.portfolio.realizedAssets('user-1', { ...assets, ...patch }))
    }
    expect(tradesKey).not.toEqual(queryKeys.portfolio.realizedTrades('user-1', { ...trades, assetId: 'asset-2' }))
  })
})
