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

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          <strong>Asset ID:</strong>
          <input
            type="text"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            placeholder="Enter asset ID"
            style={{
              marginLeft: '10px',
              padding: '5px',
              width: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </label>
        <label style={{ display: 'block' }}>
          <strong>Symbol:</strong>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter symbol (e.g., AAPL)"
            style={{
              marginLeft: '10px',
              padding: '5px',
              width: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
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

      <div style={{ marginTop: '30px' }}>
        <h2>Test Endpoints</h2>
        <EndpointTester
          method="GET"
          endpoint="/assets"
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              style={{
                marginBottom: '10px',
                padding: '5px 10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
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
              style={{
                marginBottom: '10px',
                padding: '5px 10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
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
                  style={{
                    marginBottom: '10px',
                    padding: '5px 10px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
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
                  style={{
                    marginBottom: '10px',
                    padding: '5px 10px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
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

