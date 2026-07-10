import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/use-auth'
import { useI18n } from '../i18n'
import {
  ACCOUNT_TYPE_OPTIONS,
  BROKER_OPTIONS,
  SUPPORTED_BROKER,
  type AccountType,
  type Broker,
} from '../lib/accounts.service'
import { getApiErrorMessage } from '../lib/errors'
import { formatAccountType } from '../lib/labels'
import { onboardingService } from '../lib/onboarding.service'

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

function getResponseStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } }).response?.status
}

export default function Signup() {
  const { t } = useI18n()
  const { login, status } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('broker')
  const [broker, setBroker] = useState<Broker | ''>(SUPPORTED_BROKER)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  const isBrokerType = accountType === 'broker'

  function handleAccountTypeChange(nextType: AccountType) {
    setAccountType(nextType)
    setBroker(nextType === 'broker' ? SUPPORTED_BROKER : '')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const trimmedEmail = email.trim()
    const trimmedAccountName = accountName.trim()

    if (!trimmedEmail) {
      setErrorMessage(t('auth.signup.emailRequired'))
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage(t('auth.signup.invalidEmail'))
      return
    }

    if (!trimmedAccountName) {
      setErrorMessage(t('auth.signup.accountNameRequired'))
      return
    }

    if (password.length < 6) {
      setErrorMessage(t('auth.signup.passwordTooShort'))
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const credentials = { email: trimmedEmail, password }

    try {
      await onboardingService.signup({
        ...credentials,
        starterAccount: {
          name: trimmedAccountName,
          type: accountType,
          currency: 'TWD',
          broker:
            isBrokerType && broker ? SUPPORTED_BROKER : undefined,
        },
      })
    } catch (err) {
      if (getResponseStatus(err) === 409) {
        setErrorMessage(t('auth.signup.duplicateEmail'))
      } else {
        setErrorMessage(
          getApiErrorMessage(err, t('auth.signup.genericError')),
        )
      }
      setSubmitting(false)
      return
    }

    try {
      await login(credentials)
      navigate('/', { replace: true })
    } catch {
      setErrorMessage(t('auth.signup.loginAfterSignupFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t('app.name')}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {t('auth.signup.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t('auth.signup.subtitle')}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-slate-900">
              {t('auth.signup.accountSection')}
            </h2>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t('auth.signup.emailLabel')}
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.signup.emailPlaceholder')}
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t('auth.signup.passwordLabel')}
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.signup.passwordPlaceholder')}
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-slate-500">
                {t('auth.signup.passwordHint')}
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h2 className="text-sm font-medium text-slate-900">
                {t('auth.signup.starterAccountSection')}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t('auth.signup.starterAccountHint')}
              </p>
            </div>

            <div>
              <label
                htmlFor="signup-account-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t('auth.signup.accountNameLabel')}
              </label>
              <input
                id="signup-account-name"
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={t('auth.signup.accountNamePlaceholder')}
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="signup-account-type"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t('auth.signup.accountTypeLabel')}
              </label>
              <select
                id="signup-account-type"
                value={accountType}
                onChange={(e) =>
                  handleAccountTypeChange(e.target.value as AccountType)
                }
                className={inputClassName}
              >
                {ACCOUNT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatAccountType(type, t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="signup-currency"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t('auth.signup.currencyLabel')}
              </label>
              <input
                id="signup-currency"
                type="text"
                readOnly
                value="TWD"
                className={`${inputClassName} bg-slate-50 text-slate-600`}
              />
            </div>

            {isBrokerType && (
              <div>
                <label
                  htmlFor="signup-broker"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t('auth.signup.brokerLabel')}
                </label>
                <select
                  id="signup-broker"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value as Broker | '')}
                  className={inputClassName}
                >
                  {BROKER_OPTIONS.map((option) => (
                    <option key={option.value || 'none'} value={option.value}>
                      {option.value === 'cathay'
                        ? t('accounts.brokerOptionCathay')
                        : t('accounts.brokerOptionNone')}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {t('auth.signup.brokerHint')}
                </p>
              </div>
            )}
          </section>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t('auth.signup.submitting') : t('auth.signup.submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('auth.signup.hasAccount')}{' '}
          <Link
            to="/login"
            className="font-medium text-slate-900 underline-offset-2 hover:underline"
          >
            {t('auth.signup.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
