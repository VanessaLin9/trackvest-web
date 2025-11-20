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

      <div className="mb-8 border border-gray-300 rounded-lg p-5 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="m-0">Backend Status</h2>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={`px-4 py-2 bg-blue-600 text-white border-none rounded transition-opacity ${
              isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {isLoading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {isLoading && (
          <div className="p-5 text-center">Loading...</div>
        )}

        {error && (
          <div className="p-4 bg-red-100 text-red-800 rounded">
            <strong>❌ Backend Unavailable</strong>
            <div className="mt-2.5">
              {(error as { response?: { data?: { message?: string } } })?.response?.data?.message || String(error)}
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="p-4 bg-green-100 text-green-800 rounded flex items-center gap-2.5">
            <span className="text-2xl">✓</span>
            <div>
              <strong>Backend is healthy!</strong>
              <pre className="mt-2.5 mb-0 bg-black/5 p-2.5 rounded">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2>Test Endpoint</h2>
        <EndpointTester method="GET" endpoint="/health" />
      </div>
    </div>
  )
}
