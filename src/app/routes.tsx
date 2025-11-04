
import { createBrowserRouter } from 'react-router-dom'
import Health from '../pages/health'

export const router = createBrowserRouter([
  { path: '/', element: <Health /> },
])
