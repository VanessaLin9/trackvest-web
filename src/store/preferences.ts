import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const DISPLAY_CURRENCY_MODES = ['base', 'original'] as const
export const PREFERRED_BASE_CURRENCIES = ['TWD', 'USD'] as const
export const ALLOCATION_VIEW_MODES = ['assetClass', 'type'] as const

export type DisplayCurrencyMode = (typeof DISPLAY_CURRENCY_MODES)[number]
export type PreferredBaseCurrency = (typeof PREFERRED_BASE_CURRENCIES)[number]
export type AllocationViewMode = (typeof ALLOCATION_VIEW_MODES)[number]

type PreferencesState = {
  displayCurrencyMode: DisplayCurrencyMode
  preferredBaseCurrency: PreferredBaseCurrency
  allocationViewMode: AllocationViewMode
  setDisplayCurrencyMode: (mode: DisplayCurrencyMode) => void
  setPreferredBaseCurrency: (currency: PreferredBaseCurrency) => void
  setAllocationViewMode: (mode: AllocationViewMode) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      displayCurrencyMode: 'original',
      preferredBaseCurrency: 'TWD',
      allocationViewMode: 'assetClass',
      setDisplayCurrencyMode: (displayCurrencyMode) => set({ displayCurrencyMode }),
      setPreferredBaseCurrency: (preferredBaseCurrency) => set({ preferredBaseCurrency }),
      setAllocationViewMode: (allocationViewMode) => set({ allocationViewMode }),
    }),
    {
      name: 'trackvest.preferences',
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        displayCurrencyMode: state.displayCurrencyMode,
        preferredBaseCurrency: state.preferredBaseCurrency,
        allocationViewMode: state.allocationViewMode,
      }),
    },
  ),
)
