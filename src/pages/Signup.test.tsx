import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../app/auth-context'
import { I18nProvider } from '../i18n'
import Signup from './Signup'

const { signup, login } = vi.hoisted(() => ({
  signup: vi.fn(),
  login: vi.fn(),
}))

vi.mock('../lib/onboarding.service', () => ({
  onboardingService: { signup },
}))

vi.mock('../lib/auth.service', () => ({
  authService: {
    login,
    logout: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}))

const signupResponse = {
  user: {
    id: 'user-new',
    email: 'new@example.com',
    role: 'user' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  starterAccount: {
    id: 'acct-1',
    userId: 'user-new',
    name: 'My Broker',
    type: 'broker' as const,
    currency: 'TWD' as const,
    broker: 'cathay',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
}

describe('Signup page', () => {
  beforeEach(() => {
    window.localStorage.setItem('trackvest.locale', 'en')
    signup.mockResolvedValue(signupResponse)
    login.mockResolvedValue({
      id: 'user-new',
      email: 'new@example.com',
      role: 'USER',
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  function renderSignup() {
    return render(
      <I18nProvider>
        <AuthProvider skipBootstrap>
          <MemoryRouter initialEntries={['/signup']}>
            <Routes>
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<div>Dashboard home</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>,
    )
  }

  async function fillValidForm({
    email = 'new@example.com',
    password = 'password123',
    accountName = 'My Broker',
  } = {}) {
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: email },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: password },
    })
    fireEvent.change(screen.getByLabelText('Account name'), {
      target: { value: accountName },
    })
  }

  async function submitForm() {
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  }

  it('shows a localized error when email is empty', async () => {
    renderSignup()

    await fillValidForm({ email: ' ' })
    await submitForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email is required.',
    )
    expect(signup).not.toHaveBeenCalled()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows a localized error when email format is invalid', async () => {
    renderSignup()

    await fillValidForm({ email: 'not-an-email' })
    await submitForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a valid email address.',
    )
    expect(signup).not.toHaveBeenCalled()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows a localized error when account name is empty', async () => {
    renderSignup()

    await fillValidForm({ accountName: '   ' })
    await submitForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Account name is required.',
    )
    expect(signup).not.toHaveBeenCalled()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows a localized error when password is too short', async () => {
    renderSignup()

    await fillValidForm({ password: '12345' })
    await submitForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 6 characters.',
    )
    expect(signup).not.toHaveBeenCalled()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows duplicate-email error on 409 without calling login', async () => {
    signup.mockRejectedValue({ response: { status: 409 } })
    renderSignup()

    await fillValidForm()
    await submitForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists.',
    )
    expect(signup).toHaveBeenCalledTimes(1)
    expect(login).not.toHaveBeenCalled()
  })

  it('signs up, logs in, and redirects to dashboard on success', async () => {
    renderSignup()

    await fillValidForm()
    await submitForm()

    await waitFor(() => {
      expect(screen.getByText('Dashboard home')).toBeInTheDocument()
    })

    expect(signup).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      starterAccount: {
        name: 'My Broker',
        type: 'broker',
        currency: 'TWD',
        broker: 'cathay',
      },
    })
    expect(login).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
    })
  })

  it('shows manual-login guidance when signup succeeds but login fails', async () => {
    login.mockRejectedValue(new Error('login failed'))
    renderSignup()

    await fillValidForm()
    await submitForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your account was created, but automatic sign-in failed. Please sign in manually.',
    )
    expect(signup).toHaveBeenCalledTimes(1)
    expect(login).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Dashboard home')).not.toBeInTheDocument()
  })
})
