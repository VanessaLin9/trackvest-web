import { app } from './namespaces/app'
import { auth } from './namespaces/auth'
import { locales } from './namespaces/locales'
import { routes } from './namespaces/routes'
import { common } from './namespaces/common'
import { dashboard } from './namespaces/dashboard'
import { health } from './namespaces/health'
import { users } from './namespaces/users'
import { endpointTester } from './namespaces/endpointTester'
import { accounts } from './namespaces/accounts'
import { assets } from './namespaces/assets'
import { cashbook } from './namespaces/cashbook'
import { gl } from './namespaces/gl'
import { transactions } from './namespaces/transactions'

export const messages = {
  en: {
    app: app.en,
    auth: auth.en,
    locales: locales.en,
    routes: routes.en,
    common: common.en,
    dashboard: dashboard.en,
    health: health.en,
    users: users.en,
    endpointTester: endpointTester.en,
    accounts: accounts.en,
    assets: assets.en,
    cashbook: cashbook.en,
    gl: gl.en,
    transactions: transactions.en,
  },
  'zh-TW': {
    app: app['zh-TW'],
    auth: auth['zh-TW'],
    locales: locales['zh-TW'],
    routes: routes['zh-TW'],
    common: common['zh-TW'],
    dashboard: dashboard['zh-TW'],
    health: health['zh-TW'],
    users: users['zh-TW'],
    endpointTester: endpointTester['zh-TW'],
    accounts: accounts['zh-TW'],
    assets: assets['zh-TW'],
    cashbook: cashbook['zh-TW'],
    gl: gl['zh-TW'],
    transactions: transactions['zh-TW'],
  },
} as const

export type Locale = keyof typeof messages
export type MessageTree = {
  [key: string]: string | MessageTree
}
