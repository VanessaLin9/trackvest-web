/**
 * Shared number / currency / date formatters.
 *
 * All money/number formatters accept a `locale` string so they respect the
 * user's current i18n locale. Date helpers likewise delegate to Intl APIs.
 */

type Nullable<T> = T | null | undefined

const PLACEHOLDER = '-'
const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d{1,8})?$/

/**
 * Parses an API decimal string. Null / empty / malformed stay null so
 * missing P&L is never coerced to zero.
 */
export function parseDecimalString(
  value: string | null | undefined,
): number | null {
  if (value == null || value === '') {
    return null
  }

  if (!DECIMAL_STRING_PATTERN.test(value)) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Share count with a unit suffix (not currency). */
export function formatShareQuantity(
  quantity: number,
  locale: string,
  unit: string,
): string {
  const hasFraction = Math.abs(quantity % 1) > 1e-9
  const formatted = quantity.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 4 : 0,
  })
  return `${formatted} ${unit}`
}

/** 0–2 fractional digits. Used for most hero/KPI numeric displays. */
export function formatCurrency(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/** Formats an API decimal string, or null when the value cannot be shown. */
export function formatDecimalAmount(
  value: string | null | undefined,
  locale: string,
  currency?: string | null,
): string | null {
  const parsed = parseDecimalString(value)
  if (parsed === null) {
    return null
  }

  return formatCurrencyWithCode(parsed, locale, currency)
}

/** Signed display for API decimal strings. Null means data is unavailable. */
export function formatSignedDecimalAmount(
  value: string | null | undefined,
  locale: string,
  currency?: string | null,
): string | null {
  const parsed = parseDecimalString(value)
  if (parsed === null) {
    return null
  }

  return formatSignedCurrency(parsed, locale, currency)
}

export function formatShareQuantityFromString(
  quantity: string,
  locale: string,
  unit: string,
): string {
  const parsed = parseDecimalString(quantity)
  if (parsed === null) {
    return PLACEHOLDER
  }

  return formatShareQuantity(parsed, locale, unit)
}

export function signedAmountClassName(
  value: string | null | undefined,
): string {
  const parsed = parseDecimalString(value)
  if (parsed === null) {
    return 'text-gray-500'
  }
  if (parsed > 0) {
    return 'text-emerald-700'
  }
  if (parsed < 0) {
    return 'text-red-600'
  }
  return 'text-gray-700'
}

/** Formats a number with an optional currency code suffix (e.g. "1,234.56 USD"). */
export function formatCurrencyWithCode(
  value: number,
  locale: string,
  currency?: string | null,
): string {
  const formattedValue = formatCurrency(value, locale)
  return currency ? `${formattedValue} ${currency}` : formattedValue
}

/** Adds an explicit +/- sign to the formatted value. */
export function formatSignedCurrency(
  value: number,
  locale: string,
  currency?: string | null,
): string {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${formatCurrency(Math.abs(value), locale)}${
    currency ? ` ${currency}` : ''
  }`
}

/** Compact notation for chart axes (e.g. "1.2k", "3M"). */
export function formatCompactCurrencyAxis(value: number, locale: string): string {
  const absoluteValue = Math.abs(value)

  if (absoluteValue < 1000) {
    return formatCurrency(value, locale)
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: absoluteValue < 10000 ? 1 : 0,
  }).format(value)
}

/**
 * Formats a ratio (0.12 -> "12.00%"). By default includes a +/- sign; pass
 * `signed: false` to suppress it for cases like "32% equity".
 */
export function formatPercent(
  value: number,
  options: { signed?: boolean } = {},
): string {
  const { signed = true } = options
  const prefix = signed && value > 0 ? '+' : signed && value < 0 ? '-' : ''

  return `${prefix}${(Math.abs(value) * 100).toFixed(2)}%`
}

/** Percentage points with explicit sign (used for rebalance gap deltas). */
export function formatPercentPoints(value: number): string {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${Math.abs(value * 100).toFixed(2)}pp`
}

/** Localised short date (e.g. "Nov 5, 2025" / "2025年11月5日"). */
export function formatSnapshotDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** FX rate with higher precision (4–6 fractional digits). */
export function formatFxRate(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })
}

/** Rounds to the given number of digits (default 8 for crypto-friendly precision). */
export function roundTo(value: number, digits = 8): number {
  return Number(value.toFixed(digits))
}

/**
 * Fixed 2-decimal amount with a `-` placeholder for null/undefined/empty input.
 * Used by the transactions list where empty amounts are common.
 */
export function formatFixed2Amount(
  value: Nullable<number | string>,
  locale: string,
): string {
  if (value === null || value === undefined || value === '') {
    return PLACEHOLDER
  }

  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Date-only localised format (no time component). */
export function formatDateOnly(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale)
}

/**
 * Converts a Date or ISO string to the value expected by
 * `<input type="datetime-local">` (local time, "YYYY-MM-DDTHH:mm").
 */
export function toDateTimeLocalValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

/** Current local date/time in `<input type="datetime-local">` format. */
export function getDefaultTradeTimeValue(): string {
  return toDateTimeLocalValue(new Date())
}
