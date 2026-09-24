/**
 * Centralised factory for TanStack Query cache keys.
 *
 * Keeping keys in one place means:
 * 1. Cache invalidation sites don't drift from the queries they mean
 *    to bust (easy to grep for every usage of `queryKeys.accounts.all`).
 * 2. TypeScript catches accidental shape changes — the literal tuples
 *    are `readonly` so a stray extra segment in one call won't silently
 *    miss a cache entry.
 * 3. Key structure is documented in one file instead of inferred from
 *    stringly-typed arrays scattered across pages.
 *
 * Convention: use hierarchical scopes (`portfolio.summary`, not
 * `portfolioSummary`) so consumers can also invalidate a whole scope
 * (e.g. `queryClient.invalidateQueries({ queryKey: ['portfolio'] })`).
 */
export const queryKeys = {
  health: () => ['health'] as const,

  users: () => ['users'] as const,

  accounts: {
    all: (userId: string) => ['accounts', userId] as const,
  },

  assets: {
    /**
     * Scope root — invalidate this key (or any prefix of it) to bust every
     * assets query, including the lookup list and the paged catalog.
     */
    all: (userId: string) => ['assets', userId] as const,
    /**
     * One-row probe so the investment form can tell an empty catalog from
     * “the user has not searched yet”. `total` is the signal; items are not
     * used as a dropdown.
     * 空目錄看 `total`，不把這一筆 item 當下拉選項（PR #26）。
     */
    catalogProbe: (userId: string) => ['assets', userId, 'catalog-probe'] as const,
    /**
     * Server-side symbol/name search for the investment form. The query
     * string is part of the key so each debounced term gets its own cache entry.
     */
    search: (userId: string, query: string) =>
      ['assets', userId, 'search', query] as const,
    /**
     * Paged catalog with server-side filters used by the Assets management
     * page. The `params` object participates in the key so changing any
     * filter/page automatically scopes a new cache entry.
     */
    list: (
      userId: string,
      params: {
        page: number
        q: string
        type: string
        assetClass: string
        baseCurrency: string
      },
    ) => ['assets', userId, 'list', params] as const,
  },

  transactions: {
    /** Scope root — use to invalidate every transactions list, regardless of filter. */
    all: (userId: string) => ['transactions', userId] as const,
    list: (userId: string, accountFilter: string) =>
      ['transactions', userId, accountFilter] as const,
  },

  cashbook: {
    /** GL account definitions (expense/income/asset) — rarely change. */
    glAccounts: (userId: string) => ['cashbook', 'gl-accounts', userId] as const,
    glEntries: {
      /** Scope root — invalidate every GL entries list regardless of filter. */
      all: (userId: string) => ['cashbook', 'gl-entries', userId] as const,
      list: (userId: string, accountFilter: string) =>
        ['cashbook', 'gl-entries', userId, accountFilter] as const,
    },
  },

  fx: {
    todayRate: (base: string, quote: string) =>
      ['fx', 'today-rate', base, quote] as const,
  },

  portfolio: {
    /** Scope root — use with `invalidateQueries` to bust every portfolio entry. */
    all: () => ['portfolio'] as const,
    summary: (userId: string, displayCurrency: string) =>
      ['portfolio', 'summary', userId, displayCurrency] as const,
    holdings: (userId: string, displayCurrency: string) =>
      ['portfolio', 'holdings', userId, displayCurrency] as const,
    trend: (userId: string, displayCurrency: string) =>
      ['portfolio', 'trend', userId, displayCurrency] as const,
    holdingTrend: (
      userId: string,
      assetId: string | undefined,
      displayCurrency: string,
    ) => ['portfolio', 'holding-trend', userId, assetId, displayCurrency] as const,
    rebalance: (
      userId: string,
      displayCurrency: string,
      targetEquityPercent: number,
    ) =>
      [
        'portfolio',
        'rebalance',
        userId,
        displayCurrency,
        targetEquityPercent,
      ] as const,
  },
} as const

/**
 * Normalises the optional "preferred base currency" override into the
 * string segment used inside query keys. Callers pass `undefined` when
 * no override is active; we substitute `'default'` so the cache keys
 * stay stable strings across both modes.
 */
export function resolveDisplayCurrencyKey(
  requestedDisplayCurrency: string | undefined,
): string {
  return requestedDisplayCurrency ?? 'default'
}
