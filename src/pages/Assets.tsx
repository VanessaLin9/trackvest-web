import EndpointTester from '../components/EndpointTester'
import { useState } from 'react'

export default function Assets() {
  const [assetId, setAssetId] = useState('')
  const [symbol, setSymbol] = useState('')

  return (
    <div>
      <h1>Assets API</h1>
      <p>Test asset catalog endpoints</p>

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

      <EndpointTester
        method="GET"
        endpoint="/assets"
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
          />

          <EndpointTester
            method="DELETE"
            endpoint={`/assets/${assetId}`}
          />
        </>
      )}
    </div>
  )
}

