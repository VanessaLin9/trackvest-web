import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
import Login from '../pages/Login'
import { ProtectedRoute } from './ProtectedRoute'
import { routeConfig } from './route-config'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: routeConfig.map(({ path, element }) => ({
      path,
      element,
    })),
  },
])
