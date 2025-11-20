import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import EndpointTester from '../components/EndpointTester'

export default function Health() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get('/health')).data,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })

  return (
    <div>
      <h1>Health Check</h1>
      <p>Monitor backend connectivity status</p>

      <div
        style={{
          marginBottom: '30px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
          }}
        >
          <h2 style={{ margin: 0 }}>Backend Status</h2>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {isLoading && (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
        )}

        {error && (
          <div
            style={{
              padding: '15px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
            }}
          >
            <strong>❌ Backend Unavailable</strong>
            <div style={{ marginTop: '10px' }}>
              {(error as any)?.response?.data?.message || String(error)}
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <div
            style={{
              padding: '15px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '24px' }}>✓</span>
            <div>
              <strong>Backend is healthy!</strong>
              <pre
                style={{
                  marginTop: '10px',
                  marginBottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  padding: '10px',
                  borderRadius: '4px',
                }}
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Test Endpoint</h2>
        <EndpointTester method="GET" endpoint="/health" />
      </div>
    </div>
  )
}
