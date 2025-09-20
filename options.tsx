import * as React from "react"
import { Providers } from "./providers"
import "./styles/globals.css"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"

const SETTINGS_KEY = "settings"

type Settings = {
  username?: string
  font?: {
    family?: string
    size?: number // px
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

const DEFAULTS: Required<NonNullable<Settings["font"]>> = {
  family: FONT_CHOICES[0].value,
  size: 14
}

export default function IndexOptions() {
  const [username, setUsername] = React.useState("")
  const [fontFamily, setFontFamily] = React.useState<string>(DEFAULTS.family)
  const [fontSize, setFontSize] = React.useState<number>(DEFAULTS.size)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    chrome.storage.local.get([SETTINGS_KEY], (res) => {
      const s = (res[SETTINGS_KEY] as Settings) ?? {}
      setUsername(s.username ?? "")
      setFontFamily(s.font?.family ?? DEFAULTS.family)
      setFontSize(s.font?.size ?? DEFAULTS.size)
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
          size: fontSize
        }
      }
      chrome.storage.local.set({ [SETTINGS_KEY]: next }, () => setSaving(false))
    })
  }

  const resetFont = () => {
    setFontFamily(DEFAULTS.family)
    setFontSize(DEFAULTS.size)
  }

  return (
    <Providers>
      <div className="p-5 min-w-[360px] max-w-[720px] mx-auto space-y-4">
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
                  {FONT_CHOICES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm">字體大小</label>
                  <span className="text-xs text-muted-foreground">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={20}
                  step={1}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value) || DEFAULTS.size)}
                  className="w-full cursor-pointer"
                />
              </div>
            </div>

            <div className="rounded-md border border-dashed p-4 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">預覽</div>
              <div style={{ fontFamily: fontFamily, fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                中文 English 123 ABC 我愛待辦事項 Todo List ✓
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>
              <Button variant="outline" onClick={resetFont}>還原字體預設</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Providers>
  )
}