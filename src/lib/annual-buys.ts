import type { ApiSchemas } from './api-schema'
import fixtureFile from './fixtures/annual-buys.fixtures.json'
import { parseDecimalString } from './formatters'

export type PortfolioAnnualBuyType = ApiSchemas['PortfolioAnnualBuyTypeResponseDto']
export type PortfolioAnnualBuyMonth = ApiSchemas['PortfolioAnnualBuyMonthResponseDto']
export type PortfolioAnnualBuyItem = ApiSchemas['PortfolioAnnualBuyItemResponseDto']
export type PortfolioAnnualBuysResponse = ApiSchemas['PortfolioAnnualBuysResponseDto']
export type PortfolioAnnualBuyAssetType = ApiSchemas['PortfolioAnnualBuyAssetType']

/** 與 API 的類型順序一致。股票型 ETF 仍是 etf，不併進 equity。 */
export const ANNUAL_BUY_TYPES = [
  'equity',
  'etf',
  'crypto',
  'cash',
  'other',
] as const satisfies readonly PortfolioAnnualBuyAssetType[]

const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d{1,8})?$/

export type AnnualBuyTypeAmount = {
  buyAmount: string | null
  share: string | null
  /** 只給長條高度。類型沒出現時為 0，畫面文字仍看 buyAmount／share 是否為 null。 */
  chartAmount: number
  chartShare: number
}

export type AnnualBuyYearPoint = {
  year: number
  isCurrentYear: boolean
  buyAmount: string
  types: Record<PortfolioAnnualBuyAssetType, AnnualBuyTypeAmount>
}

type FixtureFile = {
  contract: {
    method: string
    path: string
    query: { accountId: string }
  }
  scenarios: Record<string, PortfolioAnnualBuysResponse>
}

const fixtures = fixtureFile as FixtureFile

export function getAnnualBuysScenario(name: string): PortfolioAnnualBuysResponse {
  const scenario = fixtures.scenarios[name]
  if (!scenario) {
    throw new Error(`Unknown annual-buys fixture: ${name}`)
  }
  return scenario
}

/**
 * 年與月跟回應的 timeZone，不用瀏覽器時區。
 * Asia/Taipei 下 UTC 12/31 16:00 是下一年的 1 月。時區無效就不標截至目前。
 */
export function calendarParts(
  iso: string,
  timeZone: string,
): { year: number; month: number } | null {
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) {
    return null
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(instant)
    const year = Number(parts.find((part) => part.type === 'year')?.value)
    const month = Number(parts.find((part) => part.type === 'month')?.value)
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return null
    }
    return { year, month }
  } catch {
    return null
  }
}

export function annualBuyCurrencies(items: PortfolioAnnualBuyItem[]): string[] {
  return [...new Set(items.map((item) => item.currency))].sort((left, right) =>
    left.localeCompare(right),
  )
}

export function annualBuyRows(
  items: PortfolioAnnualBuyItem[],
  currency: string,
): PortfolioAnnualBuyItem[] {
  return items
    .filter((item) => item.currency === currency)
    .sort((left, right) => right.year - left.year)
}

/** 圖表按年升冪。不補客戶端的 0% 類型，也不把缺占比重算成金額比例。 */
export function annualBuyYearPoints(
  items: PortfolioAnnualBuyItem[],
  currency: string,
  currentYear: number | null,
): AnnualBuyYearPoint[] {
  return annualBuyRows(items, currency)
    .slice()
    .sort((left, right) => left.year - right.year)
    .map((item) => ({
      year: item.year,
      isCurrentYear: currentYear !== null && item.year === currentYear,
      buyAmount: item.buyAmount,
      types: typeAmounts(item.types),
    }))
}

export function yearsWithBuyMix(points: AnnualBuyYearPoint[]): AnnualBuyYearPoint[] {
  return points.filter((point) =>
    ANNUAL_BUY_TYPES.some((type) => point.types[type].share != null),
  )
}

/** 月份沿用 API 陣列。當年沒回傳的未來月份不在前端補 0。 */
export function monthsAsReturned(item: PortfolioAnnualBuyItem): PortfolioAnnualBuyMonth[] {
  return [...item.months].sort((left, right) => left.month - right.month)
}

/**
 * 占比只平移 API 字串的小數點。不拿買進金額再除一次總額。
 * null 維持 null，不能顯示成 0%。
 */
export function formatSharePercent(share: string | null | undefined): string | null {
  if (share == null || share === '' || !DECIMAL_STRING_PATTERN.test(share)) {
    return null
  }

  const negative = share.startsWith('-')
  const unsigned = negative ? share.slice(1) : share
  const [whole, fraction = ''] = unsigned.split('.')
  const padded = fraction.padEnd(2, '0')
  const percentWhole = `${whole}${padded.slice(0, 2)}`.replace(/^0+(?=\d)/, '')
  const percentFraction = padded.slice(2).replace(/0+$/, '')
  const body = percentFraction ? `${percentWhole}.${percentFraction}` : percentWhole
  return `${negative ? '-' : ''}${body}%`
}

export function formatBuyMonth(month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2020, month - 1, 1)))
}

function typeAmounts(
  types: PortfolioAnnualBuyType[],
): Record<PortfolioAnnualBuyAssetType, AnnualBuyTypeAmount> {
  const byType = new Map(types.map((type) => [type.type, type]))
  return Object.fromEntries(
    ANNUAL_BUY_TYPES.map((type) => {
      const row = byType.get(type)
      return [
        type,
        {
          buyAmount: row?.buyAmount ?? null,
          share: row?.share ?? null,
          chartAmount: parseDecimalString(row?.buyAmount) ?? 0,
          chartShare: parseDecimalString(row?.share) ?? 0,
        },
      ]
    }),
  ) as Record<PortfolioAnnualBuyAssetType, AnnualBuyTypeAmount>
}
