import { useState } from 'react'
import { api } from '../lib/api'

interface EndpointTesterProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint: string
  defaultBody?: Record<string, any>
  queryParams?: Record<string, string>
  children?: React.ReactNode
}

export default function EndpointTester({
  method,
  endpoint,
  defaultBody = {},
  queryParams = {},
  children,
}: EndpointTesterProps) {
  const [body, setBody] = useState(JSON.stringify(defaultBody, null, 2))
  const [params, setParams] = useState<Record<string, string>>(queryParams)
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          result = await api.get(url)
          break
        case 'POST':
          result = await api.post(endpoint, parsedBody)
          break
        case 'PATCH':
          result = await api.patch(endpoint, parsedBody)
          break
        case 'DELETE':
          result = await api.delete(endpoint)
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

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
      }}
    >
      <div style={{ marginBottom: '15px' }}>
        <code
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            marginRight: '10px',
            fontWeight: 'bold',
            color:
              method === 'GET'
                ? '#28a745'
                : method === 'POST'
                  ? '#007bff'
                  : method === 'PATCH'
                    ? '#ffc107'
                    : '#dc3545',
          }}
        >
          {method}
        </code>
        <code style={{ fontSize: '14px' }}>{endpoint}</code>
      </div>

      {children}

      {method !== 'GET' && (
        <div style={{ marginBottom: '15px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
            }}
          >
            Request Body (JSON):
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              width: '100%',
              minHeight: '150px',
              fontFamily: 'monospace',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
      )}

      {Object.keys(params).length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
            }}
          >
            Query Parameters:
          </label>
          {Object.entries(params).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '5px' }}>
              <input
                type="text"
                placeholder={key}
                value={value}
                onChange={(e) =>
                  setParams({ ...params, [key]: e.target.value })
                }
                style={{
                  width: '200px',
                  padding: '5px',
                  marginRight: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Loading...' : 'Send Request'}
      </button>

      {error && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ marginTop: '15px' }}>
          <div
            style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
            }}
          >
            <strong>Status:</strong>{' '}
            <span
              style={{
                color:
                  response.status >= 200 && response.status < 300
                    ? '#28a745'
                    : '#dc3545',
              }}
            >
              {response.status}
            </span>
          </div>
          <pre
            style={{
              marginTop: '10px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px',
            }}
          >
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

