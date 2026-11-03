import { describe, expect, it } from 'vitest'
import {
  formatDecimalAmount,
  formatExactDecimalAmount,
  formatShareQuantityFromString,
  formatSignedDecimalAmount,
  formatSignedExactDecimalAmount,
  parseDecimalString,
} from './formatters'

describe('decimal string formatters', () => {
  it('does not coerce null or empty values to zero', () => {
    expect(parseDecimalString(null)).toBeNull()
    expect(parseDecimalString(undefined)).toBeNull()
    expect(parseDecimalString('')).toBeNull()
    expect(formatDecimalAmount(null, 'en')).toBeNull()
    expect(formatSignedDecimalAmount(null, 'en', 'TWD')).toBeNull()
  })

  it('keeps a recorded zero distinct from missing data', () => {
    expect(parseDecimalString('0')).toBe(0)
    expect(formatSignedDecimalAmount('0', 'en', 'TWD')).toBe('0 TWD')
    expect(formatSignedDecimalAmount('50', 'en', 'TWD')).toBe('+50 TWD')
    expect(formatSignedDecimalAmount('-100', 'zh-TW', 'TWD')).toBe('-100 TWD')
  })

  it('keeps sub-0.0001 share quantities instead of rounding them to zero', () => {
    expect(formatShareQuantityFromString('0.00001', 'en', 'shares')).toBe(
      '0.00001 shares',
    )
    expect(formatShareQuantityFromString('0.00001', 'zh-TW', '股')).toBe(
      '0.00001 股',
    )
    expect(formatShareQuantityFromString('0.00000001', 'en', 'shares')).toBe(
      '0.00000001 shares',
    )
    expect(formatShareQuantityFromString('0.00000001', 'zh-TW', '股')).toBe(
      '0.00000001 股',
    )
    expect(formatShareQuantityFromString('0', 'en', 'shares')).toBe('0 shares')
    expect(formatShareQuantityFromString('0', 'zh-TW', '股')).toBe('0 股')
  })

  it('keeps 8-decimal annual amounts and does not turn null into zero', () => {
    expect(formatSignedExactDecimalAmount(null, 'en', 'TWD')).toBeNull()
    expect(formatExactDecimalAmount('0', 'en', 'TWD')).toBe('0 TWD')
    expect(formatSignedExactDecimalAmount('0', 'zh-TW', 'TWD')).toBe('0 TWD')
    expect(formatSignedExactDecimalAmount('1.00000001', 'en', 'TWD')).toBe(
      '+1.00000001 TWD',
    )
    expect(formatSignedExactDecimalAmount('-20', 'zh-TW', 'TWD')).toBe('-20 TWD')
    expect(formatExactDecimalAmount('1.00000001', 'en', 'TWD')).toBe(
      '1.00000001 TWD',
    )
  })

  it('keeps exact annual decimals that a JavaScript number would round', () => {
    expect(formatExactDecimalAmount('100000000.00000002', 'en', 'TWD')).toBe(
      '100,000,000.00000002 TWD',
    )
    expect(formatSignedExactDecimalAmount('1000000000.00000001', 'en', 'TWD')).toBe(
      '+1,000,000,000.00000001 TWD',
    )
    expect(formatSignedExactDecimalAmount('-100000000.00000002', 'zh-TW', 'TWD')).toBe(
      '-100,000,000.00000002 TWD',
    )
    expect(formatExactDecimalAmount('not-a-number', 'en', 'TWD')).toBeNull()
  })
})
