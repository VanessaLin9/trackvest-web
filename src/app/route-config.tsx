import type React from 'react'
import Dashboard from '../pages/Dashboard'
import Health from '../pages/Health'
import Users from '../pages/Users'
import Accounts from '../pages/Accounts'
import Assets from '../pages/Assets'
import Transactions from '../pages/Transactions'
import GL from '../pages/GL'
import CashbookPage from '../pages/CashbookPage'

export interface RouteConfig {
  path: string
  labelKey: string
  element: React.ReactNode
  showInNav?: boolean
}

export const routeConfig: RouteConfig[] = [
  { path: '/', labelKey: 'routes.dashboard', element: <Dashboard />, showInNav: true },
  { path: '/cashbook', labelKey: 'routes.cashbook', element: <CashbookPage />, showInNav: true },
  { path: '/investments', labelKey: 'routes.investments', element: <Transactions />, showInNav: true },
  // TODO(trackvest-web): Remove the legacy Ledger route/page after Cashbook fully replaces this debug flow.
  { path: '/gl', labelKey: 'routes.ledger', element: <GL />, showInNav: false },
  { path: '/health', labelKey: 'routes.health', element: <Health />, showInNav: false },
  { path: '/users', labelKey: 'routes.users', element: <Users />, showInNav: false },
  { path: '/accounts', labelKey: 'routes.accounts', element: <Accounts />, showInNav: true },
  { path: '/assets', labelKey: 'routes.assets', element: <Assets />, showInNav: true },
]

export const getNavItems = () => {
  return routeConfig.filter((route) => route.showInNav !== false)
}
