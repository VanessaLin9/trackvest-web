import EndpointTester from '../components/EndpointTester'
import { useState } from 'react'

export default function Accounts() {
  const [accountId, setAccountId] = useState('')
  const [userId, setUserId] = useState('')

  return (
    <div>
      <h1>Accounts API</h1>
      <p>Test account management endpoints</p>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          <strong>User ID (for filtering):</strong>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
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
          <strong>Account ID (for single operations):</strong>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Enter account ID"
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
        endpoint="/accounts"
        queryParams={{ userId: userId }}
      />

      <EndpointTester
        method="POST"
        endpoint="/accounts"
        defaultBody={{
          userId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          name: 'My Broker Account',
          type: 'broker',
          currency: 'TWD',
        }}
      />

      {accountId && (
        <>
          <EndpointTester
            method="GET"
            endpoint={`/accounts/${accountId}`}
          />

          <EndpointTester
            method="PATCH"
            endpoint={`/accounts/${accountId}`}
            defaultBody={{
              userId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
              name: 'Updated Account Name',
              type: 'broker',
              currency: 'TWD',
            }}
          />

          <EndpointTester
            method="DELETE"
            endpoint={`/accounts/${accountId}`}
          />
        </>
      )}
    </div>
  )
}

