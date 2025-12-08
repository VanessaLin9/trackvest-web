import EndpointTester from '../components/EndpointTester'
const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID


export default function GL() {
  return (
    <div>
      <h1>GL Ledger API</h1>
      <p>Test general ledger posting endpoints</p>

      <EndpointTester
        method="POST"
        endpoint="/gl/transfer"
        defaultHeaders={{
          'X-User-Id': DEMO_USER_ID,
        }}
        defaultBody={{
          userId: DEMO_USER_ID,
          fromGlAccountId: '4eb5d88d-368f-4fbd-84d7-c6f2803d5d7c',
          toGlAccountId: '4eb5d88d-368f-4fbd-84d7-c6f2803d5d7c',
          amount: 1000,
          currency: 'TWD',
          date: '2025-01-01',
          memo: 'Transfer from account to account',
        }}
      />

      <EndpointTester
        method="POST"
        endpoint="/gl/expense"
        defaultHeaders={{
          'X-User-Id': DEMO_USER_ID,
        }}
        defaultBody={{
          userId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          payFromGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          expenseGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          amount: 320,
          currency: 'TWD',
          date: '2025-11-04T12:00:00.000Z',
          memo: 'Lunch',
        }}
      />

      <EndpointTester
        method="POST"
        endpoint="/gl/income"
        defaultHeaders={{
          'X-User-Id': DEMO_USER_ID,
        }}
        defaultBody={{
          userId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          receiveToGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          incomeGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          amount: 1500,
          currency: 'TWD',
          date: '2025-11-04T09:30:00.000Z',
          memo: 'Salary (partial)',
        }}
      />
    </div>
  )
}

