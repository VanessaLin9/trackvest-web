import EndpointTester from '../components/EndpointTester'
import DataDisplay from '../components/DataDisplay'
import { useState } from 'react'

export default function Assets() {
  const [assetId, setAssetId] = useState('')
  const [symbol, setSymbol] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <h1>Assets API</h1>
      <p>View and test asset catalog endpoints</p>

      <div className="mb-5 p-4 bg-blue-50 rounded">
        <label className="block mb-2.5">
          <strong>Asset ID:</strong>
          <input
            type="text"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            placeholder="Enter asset ID"
            className="ml-2.5 p-1 w-[300px] border border-gray-300 rounded"
          />
        </label>
        <label className="block">
          <strong>Symbol:</strong>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter symbol (e.g., AAPL)"
            className="ml-2.5 p-1 w-[300px] border border-gray-300 rounded"
          />
        </label>
      </div>

      <DataDisplay
        key={refreshKey}
        endpoint="/assets"
        queryKey={['assets']}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'symbol', label: 'Symbol' },
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'baseCurrency', label: 'Base Currency' },
        ]}
        title="Assets Catalog"
        onRowClick={(row) => {
          setAssetId(row.id)
          setSymbol(row.symbol)
        }}
      />

      <div className="mt-8">
        <h2>Test Endpoints</h2>
        <EndpointTester
          method="GET"
          endpoint="/assets"
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
            >
              Refresh Data After Test
            </button>
          }
        />

        <EndpointTester
          method="POST"
          endpoint="/assets"
          defaultBody={{
            symbol: 'AAPL',
            name: 'Apple Inc.',
            type: 'equity',
            baseCurrency: 'USD',
          }}
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
            >
              Refresh Data After Create
            </button>
          }
        />

        {symbol && (
          <EndpointTester
            method="GET"
            endpoint={`/assets/symbol/${symbol}`}
          />
        )}

        {assetId && (
          <>
            <EndpointTester
              method="GET"
              endpoint={`/assets/${assetId}`}
            />

            <EndpointTester
              method="PATCH"
              endpoint={`/assets/${assetId}`}
              defaultBody={{
                symbol: 'AAPL',
                name: 'Apple Inc. (Updated)',
                type: 'equity',
                baseCurrency: 'USD',
              }}
              children={
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
                >
                  Refresh Data After Update
                </button>
              }
            />

            <EndpointTester
              method="DELETE"
              endpoint={`/assets/${assetId}`}
              children={
                <button
                  onClick={() => {
                    setRefreshKey((k) => k + 1)
                    setAssetId('')
                  }}
                  className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
                >
                  Refresh Data After Delete
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

