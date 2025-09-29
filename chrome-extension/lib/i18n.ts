import * as React from "react"
import enMessages from "../locales/en/messages.json"
import zhTWMessages from "../locales/zh_TW/messages.json"

type Locale = "en" | "zh_TW"
type MessageJson = typeof enMessages
type MessageKey = keyof MessageJson
type TranslateFunction = (key: MessageKey, substitutions?: string | string[]) => string

type MessageMap = Record<MessageKey, string>

type LocaleMessageMap = Record<Locale, MessageMap>

const DEFAULT_LOCALE: Locale = "zh_TW"

const getChromeI18n = () => (globalThis as any)?.chrome?.i18n as
  | {
      getMessage?: (messageName: string, substitutions?: string | string[]) => string
      getUILanguage?: () => string
    }
  | undefined

const getChromeMessage = (key: string, substitutions?: string | string[]): string | null => {
  try {
    const api = getChromeI18n()
    const raw = api?.getMessage?.(key as string, substitutions as any)
    if (raw) {
      return raw
    }
  } catch (error) {
    console.warn("chrome.i18n.getMessage failed", error)
  }
  return null
}

const flattenMessages = (messages: MessageJson): MessageMap => {
  const result = {} as MessageMap
  for (const [key, value] of Object.entries(messages)) {
    result[key as MessageKey] = value?.message ?? key
  }
  return result
}

const localeMessages: LocaleMessageMap = {
  en: flattenMessages(enMessages),
  zh_TW: flattenMessages(zhTWMessages)
}

const localeAliases: Record<string, Locale> = {
  en: "en",
  "en-us": "en",
  "en_gb": "en",
  zh: "zh_TW",
  "zh-tw": "zh_TW",
  "zh_tw": "zh_TW",
  "zh-hant": "zh_TW",
  "zh-hant-tw": "zh_TW"
}

const normalizeLocale = (language?: string): Locale => {
  if (!language) {
    return DEFAULT_LOCALE
  }
  const normalized = language.replace(/_/g, "-").toLowerCase()
  return localeAliases[normalized] ?? (normalized.startsWith("zh") ? "zh_TW" : "en")
}

const applySubstitutions = (template: string, substitutions?: string | string[]): string => {
  if (!substitutions) {
    return template
  }
  const values = Array.isArray(substitutions) ? substitutions : [substitutions]
  return values.reduce((acc, value, index) => acc.replace(new RegExp(`\\$${index + 1}`, "g"), value), template)
}

const translateWithLocale = (locale: Locale, key: MessageKey, substitutions?: string | string[]): string => {
  const chromeMessage = getChromeMessage(key as string, substitutions)
  if (chromeMessage) {
    return chromeMessage
  }

  const preferred = localeMessages[locale]?.[key]
  if (preferred) {
    return applySubstitutions(preferred, substitutions)
  }

  const fallback = localeMessages[DEFAULT_LOCALE]?.[key] ?? localeMessages.en?.[key]
  if (fallback) {
    return applySubstitutions(fallback, substitutions)
  }

  return key as string
}

export const getCurrentLocale = (): Locale => {
  const chromeLocale = getChromeMessage("@@ui_locale") ?? getChromeI18n()?.getUILanguage?.()
  const navigatorLocale = typeof navigator !== "undefined" ? navigator.language : undefined
  return normalizeLocale(chromeLocale ?? navigatorLocale)
}

export const t = (key: MessageKey, substitutions?: string | string[]): string => {
  const locale = getCurrentLocale()
  return translateWithLocale(locale, key, substitutions)
}

export const useI18n = () => {
  const [locale] = React.useState<Locale>(() => getCurrentLocale())

  const translate = React.useCallback(
    (key: MessageKey, substitutions?: string | string[]) => translateWithLocale(locale, key, substitutions),
    [locale]
  )

  return {
    locale,
    t: translate
  }
}

export type { Locale, MessageKey, TranslateFunction }
