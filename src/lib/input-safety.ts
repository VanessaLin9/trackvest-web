// Intentionally matches ASCII control characters and DEL so we can strip
// them from user-supplied text before sending it to the API.
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g
const MULTIPLE_WHITESPACE_REGEX = /\s+/g
const ASSET_SYMBOL_SAFE_REGEX = /^[A-Z0-9._:/-]+$/
const ASSET_NAME_SAFE_REGEX = /^[\p{L}\p{N} .,&()'"/:+_-]+$/u

export const ASSET_SYMBOL_MAX_LENGTH = 20
export const ASSET_NAME_MAX_LENGTH = 100

type TextInputOptions = {
  maxLength?: number
}

function normalizeTextInput(
  value: string,
  { maxLength = 100 }: TextInputOptions = {},
) {
  return value
    .replace(CONTROL_CHAR_REGEX, '')
    .replace(MULTIPLE_WHITESPACE_REGEX, ' ')
    .slice(0, maxLength)
}

export function sanitizeLightweightTextInput(
  value: string,
  options?: TextInputOptions,
) {
  return normalizeTextInput(value, options)
}

export function sanitizeStrictTextInput(
  value: string,
  options?: TextInputOptions,
) {
  return normalizeTextInput(value, options).trim()
}

export function normalizeAssetSymbolInput(value: string) {
  return sanitizeStrictTextInput(value, {
    maxLength: ASSET_SYMBOL_MAX_LENGTH,
  }).toUpperCase()
}

export function isSafeAssetSymbol(value: string) {
  return ASSET_SYMBOL_SAFE_REGEX.test(value)
}

export function normalizeAssetNameInput(value: string) {
  return sanitizeStrictTextInput(value, {
    maxLength: ASSET_NAME_MAX_LENGTH,
  })
}

export function isSafeAssetName(value: string) {
  return ASSET_NAME_SAFE_REGEX.test(value)
}

export function normalizeSupportedCurrencyInput(value: string) {
  return sanitizeStrictTextInput(value, { maxLength: 10 }).toUpperCase()
}
