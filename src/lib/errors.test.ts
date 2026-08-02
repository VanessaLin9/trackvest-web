import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './errors'

function axiosLikeError(data: unknown, message = 'Request failed with status code 400') {
  return Object.assign(new Error(message), {
    response: { data },
  })
}

describe('getApiErrorMessage', () => {
  it('returns a non-empty string API message unchanged', () => {
    expect(
      getApiErrorMessage(
        axiosLikeError({ message: 'alias contains unsupported characters' }),
        'fallback',
      ),
    ).toBe('alias contains unsupported characters')
  })

  it('returns a one-item string array message', () => {
    expect(
      getApiErrorMessage(
        axiosLikeError({ message: ['alias contains unsupported characters'] }),
        'fallback',
      ),
    ).toBe('alias contains unsupported characters')
  })

  it('joins multiple non-empty string messages with "; " in order', () => {
    expect(
      getApiErrorMessage(
        axiosLikeError({
          message: ['first problem', 'second problem'],
        }),
        'fallback',
      ),
    ).toBe('first problem; second problem')
  })

  it('ignores empty array entries when at least one usable string exists', () => {
    expect(
      getApiErrorMessage(
        axiosLikeError({
          message: ['', 'usable message', 'another'],
        }),
        'fallback',
      ),
    ).toBe('usable message; another')
  })

  it('falls back safely for empty or malformed API messages', () => {
    expect(
      getApiErrorMessage(axiosLikeError({ message: [] }), 'fallback'),
    ).toBe('Request failed with status code 400')
    expect(
      getApiErrorMessage(
        axiosLikeError({ message: ['', null, 1] }),
        'fallback',
      ),
    ).toBe('Request failed with status code 400')
    expect(
      getApiErrorMessage(axiosLikeError({}), 'fallback'),
    ).toBe('Request failed with status code 400')
    expect(
      getApiErrorMessage(axiosLikeError({ message: { nested: true } }), 'fallback'),
    ).toBe('Request failed with status code 400')
    expect(
      getApiErrorMessage(axiosLikeError(null), 'fallback'),
    ).toBe('Request failed with status code 400')
  })

  it('returns the supplied fallback for special import-commit rejection codes', () => {
    expect(
      getApiErrorMessage(
        axiosLikeError({
          errorCode: 'COMMIT_NOT_ALLOWED_WITH_ERRORS',
          preview: { canCommit: false },
          message: ['should not surface'],
        }),
        'commit blocked fallback',
      ),
    ).toBe('commit blocked fallback')
    expect(
      getApiErrorMessage(
        axiosLikeError({
          errorCode: 'IMPORT_COMMIT_FAILED',
          preview: { canCommit: false },
          message: 'should not surface',
        }),
        'commit failed fallback',
      ),
    ).toBe('commit failed fallback')
  })

  it('returns a native Error message when no usable API message exists', () => {
    expect(getApiErrorMessage(new Error('network down'), 'fallback')).toBe(
      'network down',
    )
  })

  it('returns the supplied fallback for non-Error unknown values', () => {
    expect(getApiErrorMessage('weird', 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(42, 'fallback')).toBe('fallback')
  })
})
