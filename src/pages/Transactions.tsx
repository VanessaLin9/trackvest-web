import EndpointTester from '../components/EndpointTester'
import { useState } from 'react'

export default function Transactions() {
  const [transactionId, setTransactionId] = useState('')

  return (
    <div>
      <h1>Transactions API</h1>
      <p>Test transaction management endpoints</p>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <label style={{ display: 'block' }}>
          <strong>Transaction ID:</strong>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter transaction ID"
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
        endpoint="/transactions"
        queryParams={{ accountId: '', assetId: '', type: '' }}
      />

      <EndpointTester
        method="POST"
        endpoint="/transactions"
        defaultBody={{
          accountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          assetId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          type: 'buy',
          amount: 1000,
          quantity: 10,
          price: 100,
          fee: 5,
          tradeTime: '2025-01-01T10:00:00Z',
          note: 'Test transaction',
        }}
      />

      {transactionId && (
        <>
          <EndpointTester
            method="GET"
            endpoint={`/transactions/${transactionId}`}
          />

          <EndpointTester
            method="PATCH"
            endpoint={`/transactions/${transactionId}`}
            defaultBody={{
              amount: 1200,
              note: 'Updated transaction',
            }}
          />

          <EndpointTester
            method="DELETE"
            endpoint={`/transactions/${transactionId}`}
          />

          <EndpointTester
            method="DELETE"
            endpoint={`/transactions/${transactionId}/hard`}
          />
        </>
      )}
    </div>
  )
}

