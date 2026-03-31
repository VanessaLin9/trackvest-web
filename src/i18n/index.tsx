import type React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { messages, type Locale, type MessageTree } from './messages'

const STORAGE_KEY = 'trackvest.locale'

type TranslationValues = Record<string, string | number>

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: TranslationValues) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function resolveLocale() {
  const savedLocale =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_KEY)
      : null

  if (savedLocale === 'en' || savedLocale === 'zh-TW') {
    return savedLocale
  }

  if (typeof navigator !== 'undefined') {
    const browserLocale = navigator.language.toLowerCase()
    if (browserLocale.startsWith('zh')) {
      return 'zh-TW'
    }
  }

  return 'en'
}

function getNestedValue(source: MessageTree, key: string) {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[segment]
  }, source)
}

function interpolate(template: string, values?: TranslationValues) {
  if (!values) {
    return template
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = values[token]
    return value === undefined ? '' : String(value)
  })
}

function translate(locale: Locale, key: string, values?: TranslationValues) {
  const keyWithPlural =
    typeof values?.count === 'number'
      ? `${key}_${values.count === 1 ? 'one' : 'other'}`
      : key

  const localizedValue =
    getNestedValue(messages[locale], keyWithPlural) ??
    getNestedValue(messages.en, keyWithPlural) ??
    getNestedValue(messages[locale], key) ??
    getNestedValue(messages.en, key)

  if (typeof localizedValue !== 'string') {
    return key
  }

  return interpolate(localizedValue, values)
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, setLocale],
  )

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}

export type { Locale }
