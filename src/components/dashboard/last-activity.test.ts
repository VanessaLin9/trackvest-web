import { describe, expect, it } from 'vitest'
import type { I18nContextValue } from '../../i18n/useI18n'
import { formatHoldingLastActivity } from './last-activity'

const t: I18nContextValue['t'] = (key, values) => {
  if (key === 'dashboard.activityBuy') return 'Buy'
  if (key === 'dashboard.lastActivityOn') {
    return `${values?.action} on ${values?.date}`
  }
  return key
}

describe('formatHoldingLastActivity', () => {
  it('shows the user note when one is present', () => {
    expect(
      formatHoldingLastActivity(
        { type: 'sell', tradeDate: '2026-04-03', note: '  trim position  ' },
        t,
        'en-US',
      ),
    ).toBe('trim position')
  })

  it('builds the sentence from type and the calendar date when the note is empty', () => {
    expect(
      formatHoldingLastActivity(
        { type: 'buy', tradeDate: '2026-04-04', note: null },
        t,
        'en-CA',
      ),
    ).toBe('Buy on 2026-04-04')
  })

  it('returns null when there is no activity', () => {
    expect(formatHoldingLastActivity(null, t, 'en-US')).toBeNull()
  })
})
