import { useState } from 'react'
import { api } from '../lib/api'

interface EndpointTesterProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint: string
  defaultBody?: Record<string, any>
  queryParams?: Record<string, string>
  children?: React.ReactNode
  defaultHeaders?: Record<string, string>
}

export default function EndpointTester({
  method,
  endpoint,
  defaultBody = {},
  queryParams = {},
  children,
  defaultHeaders = {},
}: EndpointTesterProps) {
  const [body, setBody] = useState(JSON.stringify(defaultBody, null, 2))
  const [params, setParams] = useState<Record<string, string>>(queryParams)
  const [response, setResponse] = useState<any>(null)
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
      let parsedBody = {}
      if (method !== 'GET' && body.trim()) {
        parsedBody = JSON.parse(body)
      }

      const queryString = Object.entries(params)
        .filter(([_, v]) => v.trim())
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
      const url = queryString ? `${endpoint}?${queryString}` : endpoint

      let result
      switch (method) {
        case 'GET':
          result = await api.get(url, { headers })
          break
        case 'POST':
          result = await api.post(url, parsedBody, { headers })
          break
        case 'PATCH':
          result = await api.patch(url, parsedBody, { headers })
          break
        case 'DELETE':
          result = await api.delete(url, { headers })
          break
      }

      setResponse({
        status: result.status,
        data: result.data,
      })
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'An error occurred',
      )
      if (err.response) {
        setResponse({
          status: err.response.status,
          data: err.response.data,
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
            Request Body (JSON):
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
            Query Parameters:
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

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`px-5 py-2.5 bg-blue-600 text-white border-none rounded transition-opacity ${
          loading
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:bg-blue-700'
        }`}
      >
        {loading ? 'Loading...' : 'Send Request'}
      </button>

      {error && (
        <div className="mt-4 p-2.5 bg-red-100 text-red-800 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="mt-4">
          <div className="p-2.5 bg-gray-50 rounded">
            <strong>Status:</strong>{' '}
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

