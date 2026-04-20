/**
 * Shared enum → localised label helpers.
 *
 * Each function takes the current `t()` from `useI18n()` and resolves the
 * appropriate translation key. Accepts nullable input and returns an
 * explicit "unknown" label rather than an empty string, so table/detail
 * views render predictably.
 */

import type { AssetClass, AssetType } from './assets.service'
import type { AccountType } from './accounts.service'
import type { TransactionListItem } from './investments.service'
import { BROKER_OPTIONS } from './accounts.service'

type Translate = (key: string) => string

export function formatAssetType(
  type: AssetType | string | null | undefined,
  t: Translate,
): string {
  if (!type) {
    return t('assets.unknownType')
  }

  switch (type) {
    case 'equity':
      return t('assets.typeEquity')
    case 'etf':
      return t('assets.typeEtf')
    case 'crypto':
      return t('assets.typeCrypto')
    case 'cash':
      return t('assets.typeCash')
    default:
      return type.toUpperCase()
  }
}

export function formatAssetClass(
  assetClass: AssetClass | string | null | undefined,
  t: Translate,
): string {
  if (!assetClass) {
    return t('assets.unknownAssetClass')
  }

  switch (assetClass) {
    case 'equity':
      return t('assets.assetClassEquity')
    case 'bond':
      return t('assets.assetClassBond')
    case 'cash':
      return t('assets.assetClassCash')
    case 'crypto':
      return t('assets.assetClassCrypto')
    case 'precious_metal':
      return t('assets.assetClassPreciousMetal')
    default:
      return String(assetClass)
  }
}

export function formatTransactionMode(
  mode: TransactionListItem['type'] | string,
  t: Translate,
): string {
  switch (mode) {
    case 'deposit':
      return t('transactions.modeDeposit')
    case 'buy':
      return t('transactions.modeBuy')
    case 'sell':
      return t('transactions.modeSell')
    case 'dividend':
      return t('transactions.modeDividend')
    default:
      return String(mode)
  }
}

export function formatAccountType(type: AccountType, t: Translate): string {
  switch (type) {
    case 'broker':
      return t('accounts.typeBroker')
    case 'bank':
      return t('accounts.typeBank')
    case 'cash':
      return t('accounts.typeCash')
    default:
      return type
  }
}

export function formatBroker(
  broker: string | null | undefined,
  t: Translate,
): string {
  if (!broker) {
    return '-'
  }

  if (broker === 'cathay') {
    return t('accounts.brokerOptionCathay')
  }

  const option = BROKER_OPTIONS.find((item) => item.value === broker)
  return option?.label ?? broker
}
