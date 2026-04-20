/**
 * Extracts a human-readable message from an unknown error.
 *
 * Recognises axios-style errors with `response.data.message`, then falls back
 * to a standard Error's message, and finally to the provided fallback string.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
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
