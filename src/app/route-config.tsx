import type React from 'react'
import Health from '../pages/Health'
import Users from '../pages/Users'
import Accounts from '../pages/Accounts'
import Assets from '../pages/Assets'
import Transactions from '../pages/Transactions'
import GL from '../pages/GL'
import CashbookPage from '../pages/CashbookPage'

export interface RouteConfig {
  path: string
  label: string
  element: React.ReactNode
  showInNav?: boolean // Optional: hide from nav if needed
}

export const routeConfig: RouteConfig[] = [
  { path: '/', label: 'Health', element: <Health />, showInNav: true },
  { path: '/cashbook', label: 'Cashbook', element: <CashbookPage />, showInNav: true },
  { path: '/users', label: 'Users', element: <Users />, showInNav: true },
  { path: '/accounts', label: 'Accounts', element: <Accounts />, showInNav: true },
  { path: '/assets', label: 'Assets', element: <Assets />, showInNav: true },
  { path: '/transactions', label: 'Transactions', element: <Transactions />, showInNav: true },
  { path: '/gl', label: 'GL Ledger', element: <GL />, showInNav: true },
]

// Helper to get nav items (filtered by showInNav)
export const getNavItems = () => {
  return routeConfig.filter((route) => route.showInNav !== false)
}

