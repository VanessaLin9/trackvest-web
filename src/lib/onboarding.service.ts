import { api } from './api'
import type { AccountType } from './accounts.service'

export type OnboardingUserRole = 'user' | 'admin'

export interface OnboardingSignupPayload {
  email: string
  password: string
  starterAccount: {
    name: string
    type: AccountType
    currency: 'TWD'
    broker?: string
  }
}

export interface OnboardingSignupResponse {
  user: {
    id: string
    email: string
    role: OnboardingUserRole
    createdAt: string
  }
  starterAccount: {
    id: string
    userId: string
    name: string
    type: AccountType
    currency: 'TWD'
    broker?: string | null
    createdAt: string
  }
}

export const onboardingService = {
  async signup(
    payload: OnboardingSignupPayload,
  ): Promise<OnboardingSignupResponse> {
    const response = await api.post<OnboardingSignupResponse>(
      '/onboarding/signup',
      payload,
    )
    return response.data
  },
}
