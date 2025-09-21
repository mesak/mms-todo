import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Providers } from "./providers"
import "./styles/globals.css"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { CheckCircle2 } from "lucide-react"

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

const FONT_CHOICES: { label: string; value: string }[] = [
  { label: "系統預設 (System UI)", value: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"" },
  { label: "Noto Sans TC (繁中)", value: "\"Noto Sans TC\", system-ui, -apple-system, Segoe UI, Roboto, \"Microsoft JhengHei\", Helvetica Neue, Arial, sans-serif" },
  { label: "Noto Serif TC (繁中襯線)", value: "\"Noto Serif TC\", Georgia, Cambria, \"Times New Roman\", Times, serif" },
  { label: "Inter", value: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif" },
  { label: "Roboto", value: "Roboto, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif" },
  { label: "Menlo (等寬)", value: "Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace" }
]

const DEFAULTS = {
  family: FONT_CHOICES[0].value,
  uiFontSize: 14,
  itemFontSize: 14,
  customFonts: [] as string[]
}

export default function IndexOptions() {
  const [username, setUsername] = React.useState("")
  const [fontFamily, setFontFamily] = React.useState<string>(DEFAULTS.family)
  const [uiFontSize, setUiFontSize] = React.useState<number>(DEFAULTS.uiFontSize)
  const [itemFontSize, setItemFontSize] = React.useState<number>(DEFAULTS.itemFontSize)
  const [customFonts, setCustomFonts] = React.useState<string[]>(DEFAULTS.customFonts)
  const [newCustomFont, setNewCustomFont] = React.useState<string>("")
  const [saving, setSaving] = React.useState(false)
  const [toastOpen, setToastOpen] = React.useState(false)

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
    <Providers>
      <div
        className="p-5 min-w-[360px] max-w-[720px] mx-auto space-y-4 with-ui-scale"
        style={{
          fontFamily: fontFamily,
          ["--ui-font-size" as any]: `${uiFontSize}px`,
          ["--todo-item-font-size" as any]: `${itemFontSize}px`
        }}
      >
        <h1 className="text-xl font-semibold">設定</h1>

        {/* 一般設定 */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>一般</CardTitle>
            <CardDescription>共用的基本設定</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <label className="text-sm">使用者名稱</label>
            <div className="flex gap-2">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="輸入顯示名稱" />
            </div>
          </CardContent>
        </Card>

        {/* 字體設定 */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>字體設定</CardTitle>
            <CardDescription>調整介面字體與大小（其他項目後續可再新增）</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">字體家族</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {/* 自訂字體（如果有） */}
                  {customFonts.length > 0 && (
                    <optgroup label="自訂字體">
                      {customFonts.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="預設字體">
                    {FONT_CHOICES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </optgroup>
                </select>
                {/* 新增自訂字體 */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">新增自訂字體（進階）</div>
                  <div className="flex gap-2">
                    <Input
                      value={newCustomFont}
                      onChange={(e) => setNewCustomFont(e.target.value)}
                      placeholder='例如："Noto Sans TC", system-ui, -apple-system, Segoe UI, sans-serif'
                    />
                    <Button type="button" onClick={addCustomFont}>新增</Button>
                  </div>
                  {customFonts.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {customFonts.map((f) => (
                        <button
                          key={f}
                          className="px-2 py-1 rounded border hover:bg-accent"
                          title="移除自訂字體"
                          onClick={() => removeCustomFont(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    注意：這是進階設定，請輸入完整的 CSS font-family 值（包含備援字體與正確引號）。若使用本機未安裝的字體，瀏覽器會退回到備援字體。
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">介面字體大小（UI）</label>
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
                      <label className="text-sm">條目字體大小（Item）</label>
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
              <div className="text-xs text-muted-foreground mb-1">預覽</div>
              <div style={{ fontFamily: fontFamily, fontSize: `${uiFontSize}px`, lineHeight: 1.6 }}>
                介面（UI）示例：中文 English 123 ABC
              </div>
              <div style={{ fontFamily: fontFamily, fontSize: `${itemFontSize}px`, lineHeight: 1.6 }}>
                條目（Item）示例：我愛待辦事項 Todo List ✓
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>
              <Button variant="outline" onClick={resetFont}>還原字體預設</Button>
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
              設定已儲存
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Providers>
  )
}