import EndpointTester from '../../components/dev/EndpointTester'
import { useI18n } from '../../i18n'

export default function GL() {
  const { t } = useI18n()

  return (
    <div>
      <h1>{t('gl.title')}</h1>
      <p>{t('gl.subtitle')}</p>

      <EndpointTester
        method="POST"
        endpoint="/gl/transfer"
        defaultBody={{
          fromGlAccountId: '4eb5d88d-368f-4fbd-84d7-c6f2803d5d7c',
          toGlAccountId: '4eb5d88d-368f-4fbd-84d7-c6f2803d5d7c',
          amount: 1000,
          currency: 'TWD',
          date: '2025-01-01',
          memo: t('gl.transferMemo'),
        }}
      />

      <EndpointTester
        method="POST"
        endpoint="/gl/expense"
        defaultBody={{
          payFromGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          expenseGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          amount: 320,
          currency: 'TWD',
          date: '2025-11-04T12:00:00.000Z',
          memo: t('gl.expenseMemo'),
        }}
      />

      <EndpointTester
        method="POST"
        endpoint="/gl/income"
        defaultBody={{
          receiveToGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          incomeGlAccountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
          amount: 1500,
          currency: 'TWD',
          date: '2025-11-04T09:30:00.000Z',
          memo: t('gl.incomeMemo'),
        }}
      />
    </div>
  )
}
