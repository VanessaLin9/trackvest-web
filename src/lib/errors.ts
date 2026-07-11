import type { ImportCommitRejectedResponse } from './investments.service'

/**
 * Extracts a human-readable message from an unknown error.
 *
 * Recognises axios-style errors with `response.data.message`, then falls back
 * to a standard Error's message, and finally to the provided fallback string.
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
    const message = (err as { response?: { data?: { message?: string } } })
      .response?.data?.message
    if (message) {
      return message
    }
  }

  if (err instanceof Error) {
    return err.message
  }

  return fallback
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
