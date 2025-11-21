import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
import { routeConfig } from './route-config'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: routeConfig.map(({ path, element }) => ({
      path,
      element,
    })),
  },
])
