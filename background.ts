// Background service worker for notifications and cross-context helpers
// This file is picked up by Plasmo to generate the MV3 background script.

import { fetchMe } from "./lib/msgraph"

const ICON_URL = chrome.runtime.getURL("assets/icon.png")

function createBasicNotification(title: string, message: string) {
  try {
    chrome.notifications.create("login-success-" + Date.now(), {
      type: "basic",
      iconUrl: ICON_URL,
      title,
      message,
      priority: 2
    })
  } catch (err) {
    // Silently ignore in case notifications are blocked
    console.warn("Failed to create notification:", err)
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (!msg || typeof msg !== "object") return
  const { action } = msg as { action?: string }
  if (action === "notify_login_success") {
    const username = (msg as any).username as string | undefined
    const title = "登入成功"
    const message = username ? `已成功登入 Microsoft 帳號：${username}` : "已成功登入 Microsoft 帳號"
    createBasicNotification(title, message)
  }
  if (action === "login_completed_with_token") {
    // Called by UI or auth flow after token acquisition
    // msg: { access_token }
    const accessToken = (msg as any).access_token as string | undefined
    if (!accessToken) return
    ;(async () => {
      try {
        const me = await fetchMe(accessToken)
        const newAccount = { id: me.id, upn: me.userPrincipalName, displayName: me.displayName }
        // Compare with stored account
        chrome.storage.local.get(["ms_account"], (res) => {
          const prev = res["ms_account"] as { id?: string } | undefined
          const changed = !prev || prev.id !== newAccount.id
          // Always store current account
          chrome.storage.local.set({ ms_account: newAccount }, () => {
            if (changed) {
              // Clear user-scoped caches in local storage
              chrome.storage.local.remove(["todos", "categories"], () => {
                // Broadcast to UIs to refresh their state
                chrome.runtime.sendMessage({ action: "account_changed", account: newAccount }).catch(() => {})
              })
            }
          })
        })
      } catch (e) {
        console.warn("account resolution failed:", e)
      }
    })()
  }
  if (action === "notify_error") {
    const { title = "發生錯誤", message = "" } = (msg as any) || {}
    createBasicNotification(title, message)
  }
})
