import { createBrowserRouter } from 'react-router-dom'
import Health from '../pages/Health'
import Users from '../pages/Users'
import Accounts from '../pages/Accounts'
import Assets from '../pages/Assets'
import Transactions from '../pages/Transactions'
import GL from '../pages/GL'
import Layout from '../components/Layout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Health /> },
      { path: '/users', element: <Users /> },
      { path: '/accounts', element: <Accounts /> },
      { path: '/assets', element: <Assets /> },
      { path: '/transactions', element: <Transactions /> },
      { path: '/gl', element: <GL /> },
    ],
  },
])
