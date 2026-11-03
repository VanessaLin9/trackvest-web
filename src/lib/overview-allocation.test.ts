import { describe, expect, it } from 'vitest'
import {
  allocationBarPercent,
  bondGapInsight,
  mapClassAllocations,
  mapTypeAllocations,
  overviewAllocationLabel,
  signedToneClass,
} from './overview-allocation'

const t = (key: string, values?: Record<string, string | number>) => {
  if (key === 'overview.bondsBelow') {
    return `債券比重低於參考目標 ${values?.points} 個百分點。`
  }
  if (key === 'overview.bondsAbove') {
    return `債券比重高於參考目標 ${values?.points} 個百分點。`
  }
  if (key === 'overview.bondOnTarget') {
    return '目前股債比例已符合參考目標。'
  }
  return key.replace('overview.', '')
}

describe('overview allocation helpers', () => {
  it('keeps 股票類 and 個股 as different labels for the same equity id', () => {
    expect(overviewAllocationLabel('equity', 'assetClass', t)).toBe('classEquity')
    expect(overviewAllocationLabel('equity', 'type', t)).toBe('typeEquity')
    expect(overviewAllocationLabel('etf', 'type', t)).toBe('typeEtf')
  })

  it('maps API rows without inventing missing groups', () => {
    expect(
      mapClassAllocations(
        [{ assetClass: 'equity', weight: 1, marketValue: 900 }],
        t,
      ),
    ).toEqual([
      {
        id: 'equity',
        label: 'classEquity',
        weight: 1,
        color: '#367969',
      },
    ])
    expect(mapTypeAllocations([], t)).toEqual([])
  })

  it('clamps bar widths and only colors non-zero P&L', () => {
    expect(allocationBarPercent(-0.2)).toBe(0)
    expect(allocationBarPercent(1.5)).toBe(100)
    expect(signedToneClass(-20)).toBe('ov-negative')
    expect(signedToneClass(0)).toBe('')
  })

  it('describes the 80/20 gap in percentage points', () => {
    expect(bondGapInsight(20, t)).toBe('債券比重低於參考目標 20.0 個百分點。')
    expect(bondGapInsight(-4.2, t)).toBe('債券比重高於參考目標 4.2 個百分點。')
    expect(bondGapInsight(0.004, t)).toBe('目前股債比例已符合參考目標。')
  })
})
