import * as React from "react"
import { Providers } from "./providers"
import "./styles/globals.css"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"

const SETTINGS_KEY = "settings"

export default function IndexOptions() {
  const [username, setUsername] = React.useState("")
  React.useEffect(() => {
    chrome.storage.local.get([SETTINGS_KEY], (res) => {
      setUsername(res[SETTINGS_KEY]?.username ?? "")
    })
  }, [])

  const save = () => {
    chrome.storage.local.set({ [SETTINGS_KEY]: { username } })
  }

  return (
    <Providers>
      <div className="p-4 min-w-[320px]">
        <h1 className="text-lg font-semibold mb-2">設定</h1>
        <label className="text-sm">使用者名稱</label>
        <div className="flex gap-2 mt-1">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          <Button onClick={save}>儲存</Button>
        </div>
      </div>
    </Providers>
  )
}