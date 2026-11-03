import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthenticatedUser } from '../../app/use-auth'
import { useI18n } from '../../i18n'
import { getApiErrorMessage } from '../../lib/errors'
import {
  OVERVIEW_TARGET_BOND,
  OVERVIEW_TARGET_EQUITY,
} from '../../lib/overview-allocation'
import { marketPriceService } from '../../lib/market-price.service'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys, resolveDisplayCurrencyKey } from '../../lib/query-keys'
import { usePreferencesStore } from '../../store/preferences'

export function useOverviewPortfolio() {
  const userId = useAuthenticatedUser().id
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const displayCurrencyMode = usePreferencesStore(
    (state) => state.displayCurrencyMode,
  )
  const preferredBaseCurrency = usePreferencesStore(
    (state) => state.preferredBaseCurrency,
  )
  const [priceFeedback, setPriceFeedback] = useState('')

  const requestedCurrency =
    displayCurrencyMode === 'base' ? preferredBaseCurrency : undefined
  const currencyKey = resolveDisplayCurrencyKey(requestedCurrency)
  const params = requestedCurrency
    ? { preferredBaseCurrency: requestedCurrency }
    : undefined

  const summaryQuery = useQuery({
    queryKey: queryKeys.portfolio.summary(userId, currencyKey),
    queryFn: () => portfolioService.getSummary(params),
  })
  const holdingsQuery = useQuery({
    queryKey: queryKeys.portfolio.holdings(userId, currencyKey),
    queryFn: () => portfolioService.getHoldings(params),
  })
  const rebalanceQuery = useQuery({
    queryKey: queryKeys.portfolio.rebalance(
      userId,
      currencyKey,
      OVERVIEW_TARGET_EQUITY * 100,
    ),
    queryFn: () =>
      portfolioService.getRebalance({
        ...params,
        targetEquity: OVERVIEW_TARGET_EQUITY,
        targetBond: OVERVIEW_TARGET_BOND,
      }),
  })

  const refreshPrices = useMutation({
    mutationFn: () => marketPriceService.refreshPrices(),
    onMutate: () => setPriceFeedback(''),
    onSuccess: async (result) => {
      if (result.status !== 'failed') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.portfolio.all(),
        })
      }
      setPriceFeedback(
        result.status === 'success'
          ? t('overview.pricesUpdated')
          : t('overview.pricesPartial'),
      )
    },
    onError: (error) => {
      setPriceFeedback(getApiErrorMessage(error, t('overview.pricesFailed')))
    },
  })

  return {
    requestedCurrency,
    summaryQuery,
    holdingsQuery,
    rebalanceQuery,
    refreshPrices,
    priceFeedback,
    summary: summaryQuery.data,
    holdings: holdingsQuery.data?.items ?? [],
    holdingsCurrency: holdingsQuery.data?.effectiveDisplayCurrency,
    displayCurrency:
      summaryQuery.data?.effectiveDisplayCurrency ??
      summaryQuery.data?.baseCurrency,
  }
}
