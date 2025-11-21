export function notifyLoginSuccess(username?: string) {
  const c: any = (globalThis as any).chrome
  c?.runtime?.sendMessage?.({ action: "notify_login_success", username })?.catch?.(() => {})
}

export function notifyError(title: string, message: string) {
  const c: any = (globalThis as any).chrome
  c?.runtime?.sendMessage?.({ action: "notify_error", title, message })?.catch?.(() => {})
}

// Cross-context React Query invalidation message
export type RQInvalidateTarget =
  | { type: "lists" }
  | { type: "tasks"; listId: string }
  | { type: "task"; listId: string; taskId: string }
  | { type: "attachments"; listId: string; taskId: string }

export function notifyRQInvalidate(targets: RQInvalidateTarget[]) {
  try {
    const c: any = (globalThis as any).chrome
    // 方案 1: 發送給 background service worker（後來會轉發給其他 tabs）
    c?.runtime?.sendMessage?.({ action: "rq_invalidate", targets })?.catch?.(() => {})

    // 方案 2: 通過 localStorage 觸發 StorageEvent（跨 Popup/SidePanel 同步）
    // 使用一個序列號確保即使相同 targets 也會觸發更新
    try {
      const counter = parseInt(window.localStorage.getItem("rq_invalidate_counter") ?? "0", 10)
      const nextCounter = counter + 1
      window.localStorage.setItem("rq_invalidate_counter", String(nextCounter))
      window.localStorage.setItem("rq_invalidate_payload", JSON.stringify(targets))
      console.log("[notifications] Triggered rq_invalidate via localStorage for targets:", targets)
    } catch (e) {
      console.error("[notifications] Failed to trigger rq_invalidate via localStorage:", e)
    }
  } catch {}
}
