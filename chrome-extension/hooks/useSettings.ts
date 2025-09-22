import * as React from "react"

export const SETTINGS_KEY = "settings"

export type Settings = {
  username?: string
  font?: {
    family?: string
    // legacy single size (will map to ui+item if present)
    size?: number // px
    // new granular sizes
    uiFontSize?: number // px
    itemFontSize?: number // px
    customFonts?: string[] // saved user-defined stacks
  }
}

const DEFAULTS = {
  font: {
    family:
      "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"",
    uiFontSize: 14,
    itemFontSize: 14,
    customFonts: [] as string[]
  }
}

async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (res) => {
      resolve((res[SETTINGS_KEY] as Settings) ?? {})
    })
  })
}

export function useSettings() {
  const [settings, setSettings] = React.useState<Settings>({})
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    getSettings().then((s) => {
      if (!mounted) return
      setSettings(s)
      setIsLoading(false)
    })

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area !== "local") return
      if (Object.prototype.hasOwnProperty.call(changes, SETTINGS_KEY)) {
        const v = changes[SETTINGS_KEY]
        setSettings((v?.newValue as Settings) ?? {})
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  const effectiveFontFamily = settings.font?.family ?? DEFAULTS.font.family
  // Backward compatibility: if legacy font.size is set, use it for both
  const legacySize = settings.font?.size
  const effectiveUiFontSize = settings.font?.uiFontSize ?? legacySize ?? DEFAULTS.font.uiFontSize
  const effectiveItemFontSize = settings.font?.itemFontSize ?? legacySize ?? DEFAULTS.font.itemFontSize
  const customFonts = settings.font?.customFonts ?? DEFAULTS.font.customFonts

  return {
    settings,
    isLoading,
    fontFamily: effectiveFontFamily,
    fontSize: effectiveUiFontSize,
    uiFontSize: effectiveUiFontSize,
    itemFontSize: effectiveItemFontSize,
    customFonts
  }
}
