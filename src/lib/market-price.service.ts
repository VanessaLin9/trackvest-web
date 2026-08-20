import { api } from './api'

export const PRICE_REFRESH_MARKETS = ['tw', 'us'] as const
export const PRICE_REFRESH_STATUSES = [
  'success',
  'partial_success',
  'failed',
] as const

export type PriceRefreshMarket = (typeof PRICE_REFRESH_MARKETS)[number]
export type PriceRefreshStatus = (typeof PRICE_REFRESH_STATUSES)[number]

export type PriceRefreshMarketSuccess = {
  market: PriceRefreshMarket
  status: 'success'
  startDate: string
  endDate: string
  assetsProcessed: number
  rowsUpserted: number
}

export type PriceRefreshMarketFailure = {
  market: PriceRefreshMarket
  status: 'failed'
  errorCode: 'PRICE_REFRESH_FAILED'
  message: string
}

export type PriceRefreshMarketResult =
  | PriceRefreshMarketSuccess
  | PriceRefreshMarketFailure

export type PriceRefreshResponse = {
  status: PriceRefreshStatus
  markets: [PriceRefreshMarketResult, PriceRefreshMarketResult]
}

export class PriceRefreshResponseError extends Error {
  constructor() {
    super('Invalid price refresh response')
    this.name = 'PriceRefreshResponseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isPriceRefreshMarket(value: unknown): value is PriceRefreshMarket {
  return (
    typeof value === 'string' &&
    (PRICE_REFRESH_MARKETS as readonly string[]).includes(value)
  )
}

function isPriceRefreshMarketResult(
  value: unknown,
): value is PriceRefreshMarketResult {
  if (!isRecord(value) || !isPriceRefreshMarket(value.market)) {
    return false
  }

  if (value.status === 'failed') {
    return value.errorCode === 'PRICE_REFRESH_FAILED' &&
      typeof value.message === 'string' &&
      value.message.length > 0
  }

  return (
    value.status === 'success' &&
    typeof value.startDate === 'string' &&
    typeof value.endDate === 'string' &&
    isNonNegativeInteger(value.assetsProcessed) &&
    isNonNegativeInteger(value.rowsUpserted)
  )
}

export function isPriceRefreshResponse(
  value: unknown,
): value is PriceRefreshResponse {
  if (!isRecord(value) || !PRICE_REFRESH_STATUSES.includes(value.status as PriceRefreshStatus)) {
    return false
  }

  if (!Array.isArray(value.markets) || value.markets.length !== 2) {
    return false
  }

  const markets = value.markets
  if (!markets.every(isPriceRefreshMarketResult)) {
    return false
  }

  const marketNames = new Set(markets.map((market) => market.market))
  if (marketNames.size !== 2 || !PRICE_REFRESH_MARKETS.every((market) => marketNames.has(market))) {
    return false
  }

  const successfulMarkets = markets.filter((market) => market.status === 'success').length
  if (value.status === 'success') {
    return successfulMarkets === 2
  }

  if (value.status === 'failed') {
    return successfulMarkets === 0
  }

  return successfulMarkets === 1
}

export const marketPriceService = {
  async refreshPrices(): Promise<PriceRefreshResponse> {
    const response = await api.post<unknown>('/prices/refresh')

    if (!isPriceRefreshResponse(response.data)) {
      throw new PriceRefreshResponseError()
    }

    return response.data
  },
}
