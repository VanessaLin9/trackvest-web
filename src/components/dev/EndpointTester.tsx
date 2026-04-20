import { useState } from 'react'
import { api } from '../../lib/api'
import { useI18n } from '../../i18n'
import { Button } from '../ui/Button'

interface EndpointTesterProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint: string
  defaultBody?: Record<string, unknown>
  queryParams?: Record<string, string>
  children?: React.ReactNode
  defaultHeaders?: Record<string, string>
}

interface ApiResponseView {
  status: number
  data: unknown
}

type AxiosLikeError = {
  response?: { status: number; data?: { message?: string } | unknown }
  message?: string
}

export default function EndpointTester({
  method,
  endpoint,
  defaultBody = {},
  queryParams = {},
  children,
  defaultHeaders = {},
}: EndpointTesterProps) {
  const { t } = useI18n()
  const [body, setBody] = useState(JSON.stringify(defaultBody, null, 2))
  const [params, setParams] = useState<Record<string, string>>(queryParams)
  const [response, setResponse] = useState<ApiResponseView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const headers = {
    'Content-Type': 'application/json',
    ...defaultHeaders,
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      let parsedBody: unknown = {}
      if (method !== 'GET' && body.trim()) {
        parsedBody = JSON.parse(body)
      }

      const queryString = Object.entries(params)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
      const url = queryString ? `${endpoint}?${queryString}` : endpoint

      let result
      switch (method) {
        case 'GET':
          result = await api.get<unknown>(url, { headers })
          break
        case 'POST':
          result = await api.post<unknown>(url, parsedBody, { headers })
          break
        case 'PATCH':
          result = await api.patch<unknown>(url, parsedBody, { headers })
          break
        case 'DELETE':
          result = await api.delete<unknown>(url, { headers })
          break
      }

      setResponse({
        status: result.status,
        data: result.data,
      })
    } catch (err) {
      const axiosErr = err as AxiosLikeError
      const responseData = axiosErr.response?.data
      const responseMessage =
        responseData &&
        typeof responseData === 'object' &&
        'message' in responseData &&
        typeof (responseData as { message?: unknown }).message === 'string'
          ? (responseData as { message: string }).message
          : undefined
      setError(
        responseMessage ||
          axiosErr.message ||
          t('endpointTester.requestFailed'),
      )
      if (axiosErr.response) {
        setResponse({
          status: axiosErr.response.status,
          data: axiosErr.response.data,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const methodColors = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PATCH: 'text-yellow-600',
    DELETE: 'text-red-600',
  }

  return (
    <div className="border border-gray-300 rounded-lg p-5 mb-5">
      <div className="mb-4">
        <code
          className={`inline-block px-2 py-1 bg-gray-100 rounded mr-2.5 font-bold ${methodColors[method]}`}
        >
          {method}
        </code>
        <code className="text-sm">{endpoint}</code>
      </div>

      {children}

      {method !== 'GET' && (
        <div className="mb-4">
          <label className="block mb-1 font-bold">
            {t('endpointTester.requestBody')}:
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full min-h-[150px] font-mono p-2.5 border border-gray-300 rounded"
          />
        </div>
      )}

      {Object.keys(params).length > 0 && (
        <div className="mb-4">
          <label className="block mb-1 font-bold">
            {t('endpointTester.queryParameters')}:
          </label>
          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="mb-1">
              <input
                type="text"
                placeholder={key}
                value={value}
                onChange={(e) =>
                  setParams({ ...params, [key]: e.target.value })
                }
                className="w-[200px] p-1 mr-2.5 border border-gray-300 rounded"
              />
            </div>
          ))}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? t('common.loading') : t('common.sendRequest')}
      </Button>

      {error && (
        <div className="mt-4 p-2.5 bg-red-100 text-red-800 rounded">
          <strong>{t('common.error')}:</strong> {error}
        </div>
      )}

      {response && (
        <div className="mt-4">
          <div className="p-2.5 bg-gray-50 rounded">
            <strong>{t('common.status')}:</strong>{' '}
            <span
              className={
                response.status >= 200 && response.status < 300
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {response.status}
            </span>
          </div>
          <pre className="mt-2.5 p-4 bg-gray-50 rounded overflow-auto max-h-[400px]">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
