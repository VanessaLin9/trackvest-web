import type { AssetAliasConflictResponse } from './assets.service'
import type { ImportCommitRejectedResponse } from './investments.service'

/**
 * Extracts a human-readable message from an unknown error.
 *
 * Recognises axios-style errors with `response.data.message` (string or Nest
 * `string[]`), then falls back to a standard Error's message, and finally to
 * the provided fallback string.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const rejection = parseImportCommitRejection(err)
  if (rejection) {
    if (rejection.errorCode === 'COMMIT_NOT_ALLOWED_WITH_ERRORS') {
      return fallback
    }
    if (rejection.errorCode === 'IMPORT_COMMIT_FAILED') {
      return fallback
    }
  }

  if (err && typeof err === 'object' && 'response' in err) {
    const message = (err as { response?: { data?: { message?: unknown } } })
      .response?.data?.message
    const apiMessage = readApiDataMessage(message)
    if (apiMessage) {
      return apiMessage
    }
  }

  if (err instanceof Error) {
    return err.message
  }

  return fallback
}

/** Nest 常回 `message: string | string[]`；陣列只取非空字串並以 `; ` 串接，避免落到 Axios status text（PR #24）。 */
function readApiDataMessage(message: unknown): string | null {
  if (typeof message === 'string' && message) {
    return message
  }

  if (Array.isArray(message)) {
    const parts = message.filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0,
    )
    if (parts.length > 0) {
      return parts.join('; ')
    }
  }

  return null
}

export function parseImportCommitRejection(
  err: unknown,
): ImportCommitRejectedResponse | null {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return null
  }

  const data = (err as { response?: { data?: unknown } }).response?.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('errorCode' in data) ||
    !('preview' in data)
  ) {
    return null
  }

  return data as ImportCommitRejectedResponse
}

export function parseAssetAliasConflict(
  err: unknown,
): AssetAliasConflictResponse | null {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return null
  }

  const data = (err as { response?: { data?: unknown } }).response?.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('code' in data) ||
    !('existingAsset' in data) ||
    (data as { code?: unknown }).code !== 'ASSET_ALIAS_CONFLICT'
  ) {
    return null
  }

  return data as AssetAliasConflictResponse
}
