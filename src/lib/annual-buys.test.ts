import { describe, expect, it } from 'vitest'
import {
  annualBuyCurrencies,
  annualBuyRows,
  annualBuyYearPoints,
  calendarParts,
  formatSharePercent,
  getAnnualBuysScenario,
  monthChartTooltipText,
  monthsAsReturned,
  yearsWithBuyMix,
} from './annual-buys'

describe('annual buy calendar', () => {
  it('uses Asia/Taipei, including the UTC new-year boundary', () => {
    expect(calendarParts('2025-12-31T15:59:59.000Z', 'Asia/Taipei')).toEqual({
      year: 2025,
      month: 12,
    })
    expect(calendarParts('2025-12-31T16:00:00.000Z', 'Asia/Taipei')).toEqual({
      year: 2026,
      month: 1,
    })
    expect(calendarParts('not-a-date', 'Asia/Taipei')).toBeNull()
    expect(calendarParts('2026-06-15T04:00:00.000Z', 'Not/AZone')).toBeNull()
  })
})

describe('annual buy display contract', () => {
  it('keeps ETF separate from stock and does not invent a share for a year with no buys', () => {
    const response = getAnnualBuysScenario('mixed_years')
    const current = calendarParts(response.generatedAt, response.timeZone)
    const rows = annualBuyRows(response.items, 'TWD')
    const points = annualBuyYearPoints(response.items, 'TWD', current?.year ?? null)

    expect(rows.map((item) => item.year)).toEqual([2026, 2025, 2024])
    expect(points.map((point) => point.year)).toEqual([2024, 2025, 2026])
    expect(points.find((point) => point.isCurrentYear)?.year).toBe(2026)
    expect(rows[0].types.map((type) => type.type)).toEqual(['etf', 'crypto'])
    expect(rows[1].types).toEqual([])
    expect(formatSharePercent(rows[0].types[0].share)).toBe('85.754986%')
    expect(yearsWithBuyMix(points).map((point) => point.year)).toEqual([2024, 2026])
  })

  it('does not pad the open year out to December', () => {
    const current = getAnnualBuysScenario('mixed_years').items[0]
    const finished = getAnnualBuysScenario('mixed_years').items[2]

    expect(monthsAsReturned(current).map((month) => month.month)).toEqual([1, 2, 3, 4, 5, 6])
    expect(monthsAsReturned(finished)).toHaveLength(12)
    expect(monthsAsReturned(finished).find((month) => month.month === 2)?.buyAmount).toBe('0')
  })

  it('does not add TWD and USD, and keeps crypto, cash, and other', () => {
    expect(annualBuyCurrencies(getAnnualBuysScenario('currencies').items)).toEqual([
      'TWD',
      'USD',
    ])
    expect(
      getAnnualBuysScenario('all_types').items[0].types.map((type) => type.type),
    ).toEqual(['crypto', 'cash', 'other'])
  })

  it('formats a monthly type tooltip from the API decimal string', () => {
    const item = getAnnualBuysScenario('mixed_years').items[0]
    const precise = {
      ...item,
      months: [
        {
          month: 1,
          buyAmount: '100000000.00000002',
          types: [
            {
              type: 'equity' as const,
              buyAmount: '100000000.00000002',
              share: '1',
            },
          ],
        },
      ],
    }

    expect(monthChartTooltipText(precise, 1, 'equity', 'en', 'TWD', 'missing')).toBe(
      '100,000,000.00000002 TWD',
    )
    expect(monthChartTooltipText(precise, 1, 'etf', 'en', 'TWD', 'missing')).toBe('missing')
    expect(monthChartTooltipText(item, 2, 'etf', 'en', 'TWD', 'missing')).toBe('missing')
  })

  it('turns a ratio string into a percent without dividing amounts again', () => {
    expect(formatSharePercent(null)).toBeNull()
    expect(formatSharePercent('1')).toBe('100%')
    expect(formatSharePercent('0.75')).toBe('75%')
    expect(formatSharePercent('0')).toBe('0%')
    expect(formatSharePercent('nope')).toBeNull()
  })
})
