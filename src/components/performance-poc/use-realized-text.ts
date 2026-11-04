import { useI18n } from '../../i18n'
import { formatExactDecimalAmount, formatSignedExactDecimalAmount } from '../../lib/formatters'

export function useRealizedText() {
  const { t, locale } = useI18n()
  const text = (key: string, values?: Record<string, string | number>) => t(`performancePoc.${key}`, values)
  const amount = (value: string | null) => formatExactDecimalAmount(value, locale) ?? text('unavailable')
  const signed = (value: string | null) => formatSignedExactDecimalAmount(value, locale) ?? text('unavailable')
  return { text, locale, amount, signed }
}

export function pnlClass(value: string | null) {
  return value === null ? '' : value.startsWith('-') ? 'pf-loss' : 'pf-gain'
}
