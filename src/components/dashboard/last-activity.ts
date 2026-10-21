import type { I18nContextValue } from '../../i18n/useI18n'
import type { PortfolioHolding } from '../../lib/portfolio.service'

type LastActivity = NonNullable<PortfolioHolding['lastActivity']>
type Translate = I18nContextValue['t']

function formatTradeDate(tradeDate: string, locale: string): string {
  const [year, month, day] = tradeDate.split('-').map(Number)
  if (!year || !month || !day) {
    return tradeDate
  }

  return new Date(year, month - 1, day).toLocaleDateString(locale)
}

function activityLabel(type: LastActivity['type'], t: Translate): string {
  switch (type) {
    case 'buy':
      return t('dashboard.activityBuy')
    case 'sell':
      return t('dashboard.activitySell')
    case 'dividend':
      return t('dashboard.activityDividend')
    case 'fee':
      return t('dashboard.activityFee')
    case 'deposit':
      return t('dashboard.activityDeposit')
    case 'withdraw':
      return t('dashboard.activityWithdraw')
    default:
      return type
  }
}

/** 備註沿用使用者原文。沒有備註才用 type 與日期組文案，避免 API 回英文句子（PR #26）。 */
export function formatHoldingLastActivity(
  activity: PortfolioHolding['lastActivity'],
  t: Translate,
  locale: string,
): string | null {
  if (!activity) {
    return null
  }

  const note = activity.note?.trim()
  if (note) {
    return note
  }

  return t('dashboard.lastActivityOn', {
    action: activityLabel(activity.type, t),
    date: formatTradeDate(activity.tradeDate, locale),
  })
}
