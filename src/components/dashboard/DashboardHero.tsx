import { useMemo } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useI18n } from '../../i18n'
import { getApiErrorMessage } from '../../lib/errors'
import type { FxCurrentRate } from '../../lib/fx.service'
import {
  formatFxRate,
  formatPercent,
  formatSignedCurrency,
  formatSnapshotDate,
} from '../../lib/formatters'
import type { PortfolioSummary } from '../../lib/portfolio.service'
import { usePreferencesStore } from '../../store/preferences'
import { SegmentedControl } from '../ui/SegmentedControl'

interface DashboardHeroProps {
  summary: PortfolioSummary | undefined
  displayCurrency: string | null
  fxRateQuery: UseQueryResult<FxCurrentRate, Error>
}

/**
 * Top banner group:
 *   - gradient hero (greeting + snapshot PnL)
 *   - amber "scope & preferences" card with display-currency controls,
 *     secondary KPI pills, and today's FX rate.
 *
 * Reads display preferences directly from the zustand store rather than
 * threading props from the parent; that keeps the Dashboard page focused on
 * data fetching.
 */
export function DashboardHero({
  summary,
  displayCurrency,
  fxRateQuery,
}: DashboardHeroProps) {
  const { t, locale } = useI18n()
  const {
    displayCurrencyMode,
    preferredBaseCurrency,
    setDisplayCurrencyMode,
    setPreferredBaseCurrency,
  } = usePreferencesStore()

  const isBaseCurrencyAligned =
    summary?.displayCurrencyMode === 'preferred-base' &&
    summary.effectiveDisplayCurrency === preferredBaseCurrency

  const displayModeStatusMessage = useMemo(() => {
    if (summary?.displayCurrencyMode === 'portfolio-default') {
      return t('dashboard.displayModeStatusOriginal', {
        currency: summary.effectiveDisplayCurrency ?? t('common.notAvailable'),
      })
    }

    if (isBaseCurrencyAligned) {
      return t('dashboard.displayModeStatusBaseAligned', {
        currency: summary?.effectiveDisplayCurrency ?? preferredBaseCurrency,
      })
    }

    return t('dashboard.displayModeStatusBasePending', {
      currency: preferredBaseCurrency,
      currentCurrency:
        summary?.effectiveDisplayCurrency ?? t('common.notAvailable'),
    })
  }, [
    isBaseCurrencyAligned,
    preferredBaseCurrency,
    summary?.displayCurrencyMode,
    summary?.effectiveDisplayCurrency,
    t,
  ])

  const fxRateErrorMessage = useMemo(() => {
    if (!fxRateQuery.error) {
      return null
    }
    return getApiErrorMessage(fxRateQuery.error, t('dashboard.fxRateUnavailable'))
  }, [fxRateQuery.error, t])

  return (
    <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,#0f172a_44%,#020617_100%)] p-7 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-200">
              {t('dashboard.heroEyebrow')}
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {t('dashboard.heroTitle')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                {t('dashboard.heroDescription')}
              </p>
            </div>
          </div>

          <div className="min-w-[220px] rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-100">
              {t('dashboard.snapshotLabel')}
            </p>
            <p className="mt-3 text-2xl font-semibold">
              {formatSignedCurrency(summary?.totalPnl ?? 0, locale, displayCurrency)}
            </p>
            <p className="mt-2 text-sm text-slate-200">
              {summary
                ? t('dashboard.snapshotAsOf', {
                    date: formatSnapshotDate(summary.asOf, locale),
                  })
                : t('dashboard.snapshotLiveNotice')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-700">
          {t('dashboard.scopeEyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-amber-950">
          {t('dashboard.scopeTitle')}
        </h2>
        <p className="mt-3 text-sm leading-6 text-amber-900/80">
          {t('dashboard.scopeDescription')}
        </p>
        <div className="mt-5 rounded-2xl border border-amber-200/80 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
            {t('dashboard.displayPreferencesTitle')}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">
            {t('dashboard.displayPreferencesDescription')}
          </p>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                {t('dashboard.displayCurrencyModeLabel')}
              </p>
              <SegmentedControl
                tone="amber"
                containerTone="amber"
                value={displayCurrencyMode}
                onChange={setDisplayCurrencyMode}
                options={[
                  {
                    value: 'original',
                    label: t('dashboard.displayCurrencyModeOriginal'),
                  },
                  {
                    value: 'base',
                    label: t('dashboard.displayCurrencyModeBase'),
                  },
                ]}
              />
            </div>

            <div
              aria-hidden={displayCurrencyMode !== 'base'}
              className={`min-w-[13rem] transition-opacity duration-200 ${
                displayCurrencyMode === 'base'
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0'
              }`}
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                {t('dashboard.preferredBaseCurrencyLabel')}
              </p>
              <SegmentedControl
                containerTone="amber"
                value={preferredBaseCurrency}
                onChange={setPreferredBaseCurrency}
                options={[
                  { value: 'TWD', label: 'TWD' },
                  { value: 'USD', label: 'USD' },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
              {t('dashboard.displayModeStatusLabel')}
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-950/85">
              {displayModeStatusMessage}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('dashboard.assetCount')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {summary?.holdingsCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('dashboard.totalReturn')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">
              {formatPercent(summary?.totalReturnRate ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
            {t('dashboard.fxRateTitle')}
          </p>
          {fxRateQuery.isLoading ? (
            <p className="mt-2 text-sm text-amber-900/80">
              {t('dashboard.fxRateLoading')}
            </p>
          ) : fxRateErrorMessage ? (
            <p className="mt-2 text-sm text-red-700">{fxRateErrorMessage}</p>
          ) : fxRateQuery.data ? (
            <>
              <div className="mt-2 flex items-baseline gap-3">
                <p className="text-xl font-semibold text-slate-900">
                  {formatFxRate(fxRateQuery.data.rate, locale)}
                </p>
                <p className="text-sm text-amber-900/80">
                  {t('dashboard.fxRatePair', {
                    base: fxRateQuery.data.base,
                    quote: fxRateQuery.data.quote,
                  })}
                </p>
              </div>
              <p className="mt-1 text-sm text-amber-900/80">
                {t('dashboard.fxRateMeta', {
                  date: fxRateQuery.data.date,
                  provider: fxRateQuery.data.provider,
                })}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-amber-900/80">
              {t('dashboard.fxRateUnavailable')}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
