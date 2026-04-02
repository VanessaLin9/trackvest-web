const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g
const MULTIPLE_WHITESPACE_REGEX = /\s+/g

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
