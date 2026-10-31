import { describe, expect, it } from 'vitest'
import {
  formatDecimalAmount,
  formatSignedDecimalAmount,
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
})
