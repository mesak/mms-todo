import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Providers } from "./providers"
import "./styles/globals.css"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { CheckCircle2 } from "lucide-react"
import { MessageKey, useI18n } from "./lib/i18n"
import { useAuth } from "./hooks/useAuth"
import { useMsMe } from "./hooks/useMsTodos"
import { debounce } from "./lib/utils"

const SETTINGS_KEY = "settings"

type Settings = {
  username?: string
  font?: {
    family?: string
    // legacy size (kept for back-compat)
    size?: number
    uiFontSize?: number
    itemFontSize?: number
    customFonts?: string[]
  }
}

const FONT_CHOICES: { labelKey: MessageKey; fallbackLabel: string; value: string }[] = [
  {
    labelKey: "font_choice_system_ui",
    fallbackLabel: "System default (System UI)",
    value: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\""
  },
  {
    labelKey: "font_choice_noto_sans_tc",
    fallbackLabel: "Noto Sans TC (Traditional Chinese)",
    value: "\"Noto Sans TC\", system-ui, -apple-system, Segoe UI, Roboto, \"Microsoft JhengHei\", Helvetica Neue, Arial, sans-serif"
  },
  {
    labelKey: "font_choice_noto_serif_tc",
    fallbackLabel: "Noto Serif TC (Traditional Chinese serif)",
    value: "\"Noto Serif TC\", Georgia, Cambria, \"Times New Roman\", Times, serif"
  },
  {
    labelKey: "font_choice_inter",
    fallbackLabel: "Inter",
    value: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
  },
  {
    labelKey: "font_choice_roboto",
    fallbackLabel: "Roboto",
    value: "Roboto, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
  },
  {
    labelKey: "font_choice_menlo",
    fallbackLabel: "Menlo (Monospaced)",
    value: "Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace"
  }
]

const DEFAULTS = {
  family: FONT_CHOICES[0].value,
  uiFontSize: 14,
  itemFontSize: 14,
  customFonts: [] as string[]
}

function OptionsContent() {
  const [username, setUsername] = React.useState("")
  const [fontFamily, setFontFamily] = React.useState<string>(DEFAULTS.family)
  const [uiFontSize, setUiFontSize] = React.useState<number>(DEFAULTS.uiFontSize)
  const [itemFontSize, setItemFontSize] = React.useState<number>(DEFAULTS.itemFontSize)
  const [customFonts, setCustomFonts] = React.useState<string[]>(DEFAULTS.customFonts)
  const [newCustomFont, setNewCustomFont] = React.useState<string>("")
  const [saving, setSaving] = React.useState(false)
  const [toastOpen, setToastOpen] = React.useState(false)
  const { t } = useI18n()
  const auth = useAuth()
  const { token, isLoggedIn, isLoading: authLoading, phase, login, logout } = auth
  const { data: me, isLoading: meLoading, isFetching: meFetching } = useMsMe(token, { enabled: isLoggedIn })
  const accountLoading = authLoading || phase === "refreshing" || (isLoggedIn && (meLoading || meFetching))
  const accountName = me?.displayName || me?.userPrincipalName || me?.mail || username || ""
  const accountEmail = me?.mail || me?.userPrincipalName
  const accountId = me?.id
  const handleLogin = React.useMemo(() => debounce(async () => { try { await login?.() } catch (e) { console.error(e) } }, 600, true, false), [login])
  const handleLogout = React.useMemo(() => debounce(async () => { try { await logout?.() } catch (e) { console.error(e) } }, 600, true, false), [logout])

  React.useEffect(() => {
    chrome.storage.local.get([SETTINGS_KEY], (res) => {
      const s = (res[SETTINGS_KEY] as Settings) ?? {}
      setUsername(s.username ?? "")
      setFontFamily(s.font?.family ?? DEFAULTS.family)
      // back-compat: if legacy size exists, use it for both; else use granular sizes
      const legacy = s.font?.size
      setUiFontSize(s.font?.uiFontSize ?? legacy ?? DEFAULTS.uiFontSize)
      setItemFontSize(s.font?.itemFontSize ?? legacy ?? DEFAULTS.itemFontSize)
      setCustomFonts(s.font?.customFonts ?? DEFAULTS.customFonts)
    })
  }, [])

  React.useEffect(() => {
    if (isLoggedIn) {
      const fromAccount = me?.displayName || me?.userPrincipalName || me?.mail
      if (fromAccount && fromAccount !== username) {
        setUsername(fromAccount)
      }
    } else if (!authLoading && username) {
      setUsername("")
    }
  }, [isLoggedIn, me?.displayName, me?.userPrincipalName, me?.mail, authLoading, username])

  const save = () => {
    setSaving(true)
    chrome.storage.local.get([SETTINGS_KEY], (res) => {
      const current = (res[SETTINGS_KEY] as Settings) ?? {}
      const next: Settings = {
        ...current,
        username,
        font: {
          ...(current.font ?? {}),
          family: fontFamily,
          uiFontSize,
          itemFontSize,
          customFonts
        }
      }
      chrome.storage.local.set({ [SETTINGS_KEY]: next }, () => {
        setSaving(false)
        // In-page toast
        setToastOpen(true)
        window.setTimeout(() => setToastOpen(false), 2000)
      })
    })
  }

  const resetFont = () => {
    setFontFamily(DEFAULTS.family)
    setUiFontSize(DEFAULTS.uiFontSize)
    setItemFontSize(DEFAULTS.itemFontSize)
  }

  const addCustomFont = () => {
    const v = newCustomFont.trim()
    if (!v) return
    if (customFonts.includes(v)) return
    const next = [...customFonts, v]
    setCustomFonts(next)
    setNewCustomFont("")
    // auto switch to newly added
    setFontFamily(v)
  }

  const removeCustomFont = (font: string) => {
    const next = customFonts.filter((f) => f !== font)
    setCustomFonts(next)
    if (fontFamily === font) {
      setFontFamily(DEFAULTS.family)
    }
  }

  return (
    <>
      <div
        className="p-5 min-w-[360px] max-w-[720px] mx-auto space-y-4 with-ui-scale"
        style={{
          fontFamily: fontFamily,
          ["--ui-font-size" as any]: `${uiFontSize}px`,
          ["--todo-item-font-size" as any]: `${itemFontSize}px`
        }}
      >
        <h1 className="text-xl font-semibold">{t("settings_title")}</h1>

        {/* 一般設定 */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{t("general_section_title")}</CardTitle>
            <CardDescription>{t("general_section_description")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("account_section_label")}</div>
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                {accountLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-spin inline-flex h-full w-full rounded-full border-2 border-muted-foreground border-t-transparent"></span>
                    </span>
                    {t("account_section_loading")}
                  </div>
                ) : isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("account_section_signed_in_as")}</div>
                      <div className="text-sm font-medium leading-tight break-words">{accountName}</div>
                      {accountEmail ? (
                        <div className="text-xs text-muted-foreground leading-tight break-words">{accountEmail}</div>
                      ) : null}
                      {accountId ? (
                        <div className="text-[11px] text-muted-foreground leading-tight break-words">
                          {t("account_section_account_id_label")}: {accountId}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleLogout} disabled={accountLoading}>
                        {t("sign_out")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground leading-6">{t("account_section_signed_out")}</div>
                    <Button onClick={handleLogin} disabled={accountLoading}>
                      <span className="inline-flex items-center gap-2">
                        {t("sign_in")}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 字體設定 */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{t("font_section_title")}</CardTitle>
            <CardDescription>{t("font_section_description")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">{t("font_family_label")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {/* 自訂字體（如果有） */}
                  {customFonts.length > 0 && (
                    <optgroup label={t("custom_fonts_group_label")}>
                      {customFonts.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={t("default_fonts_group_label")}>
                    {FONT_CHOICES.map((f) => (
                      <option key={f.value} value={f.value}>{t(f.labelKey) ?? f.fallbackLabel}</option>
                    ))}
                  </optgroup>
                </select>
                {/* 新增自訂字體 */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("custom_font_helper")}</div>
                  <div className="flex gap-2">
                    <Input
                      value={newCustomFont}
                      onChange={(e) => setNewCustomFont(e.target.value)}
                      placeholder={t("custom_font_placeholder") ?? undefined}
                    />
                    <Button type="button" onClick={addCustomFont}>{t("add_custom_font")}</Button>
                  </div>
                  {customFonts.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {customFonts.map((f) => (
                        <button
                          key={f}
                          className="px-2 py-1 rounded border hover:bg-accent"
                          title={t("remove_custom_font")}
                          onClick={() => removeCustomFont(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("custom_font_notice")}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t("ui_font_size_label")}</label>
                      <span className="text-xs text-muted-foreground">{uiFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={20}
                      step={1}
                      value={uiFontSize}
                      onChange={(e) => setUiFontSize(parseInt(e.target.value) || DEFAULTS.uiFontSize)}
                      className="w-full cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t("item_font_size_label")}</label>
                      <span className="text-xs text-muted-foreground">{itemFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={20}
                      step={1}
                      value={itemFontSize}
                      onChange={(e) => setItemFontSize(parseInt(e.target.value) || DEFAULTS.itemFontSize)}
                      className="w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-dashed p-4 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">{t("preview_label")}</div>
              <div style={{ fontFamily: fontFamily, fontSize: `${uiFontSize}px`, lineHeight: 1.6 }}>
                {t("preview_ui_sample")}
              </div>
              <div style={{ fontFamily: fontFamily, fontSize: `${itemFontSize}px`, lineHeight: 1.6 }}>
                {t("preview_item_sample")}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>{saving ? t("saving") : t("save_action")}</Button>
              <Button variant="outline" onClick={resetFont}>{t("reset_font_defaults")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Toast */}
      <AnimatePresence>
        {toastOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 34, mass: 0.5 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <div className="rounded-md border bg-card text-card-foreground shadow-md px-3 py-2 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {t("settings_saved_toast")}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function IndexOptions() {
  return (
    <Providers>
      <OptionsContent />
    </Providers>
  )
}