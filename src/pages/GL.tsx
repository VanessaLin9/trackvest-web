import EndpointTester from '../components/EndpointTester'
import { useCurrentUserId } from '../app/current-user'


export default function GL() {
  const currentUserId = useCurrentUserId()

  if (!currentUserId) {
    return (
      <div>
        <h1>GL Ledger API</h1>
        <p className="text-red-600">
          VITE_DEMO_USER_ID is not set. Please set it in your .env file.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>GL Ledger API</h1>
      <p>Test general ledger posting endpoints</p>

      <EndpointTester
        method="POST"
        endpoint="/gl/transfer"
        defaultBody={{
          userId: currentUserId,
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
        defaultBody={{
          userId: currentUserId,
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
        defaultBody={{
          userId: currentUserId,
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
