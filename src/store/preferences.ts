import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const DISPLAY_CURRENCY_MODES = ['base', 'original'] as const
export const PREFERRED_BASE_CURRENCIES = ['TWD', 'USD'] as const

export type DisplayCurrencyMode = (typeof DISPLAY_CURRENCY_MODES)[number]
export type PreferredBaseCurrency = (typeof PREFERRED_BASE_CURRENCIES)[number]

type PreferencesState = {
  displayCurrencyMode: DisplayCurrencyMode
  preferredBaseCurrency: PreferredBaseCurrency
  setDisplayCurrencyMode: (mode: DisplayCurrencyMode) => void
  setPreferredBaseCurrency: (currency: PreferredBaseCurrency) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      displayCurrencyMode: 'original',
      preferredBaseCurrency: 'TWD',
      setDisplayCurrencyMode: (displayCurrencyMode) => set({ displayCurrencyMode }),
      setPreferredBaseCurrency: (preferredBaseCurrency) => set({ preferredBaseCurrency }),
    }),
    {
      name: 'trackvest.preferences',
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        displayCurrencyMode: state.displayCurrencyMode,
        preferredBaseCurrency: state.preferredBaseCurrency,
      }),
    },
  ),
)
