// Background service worker for notifications and cross-context helpers
// This file is picked up by Plasmo to generate the MV3 background script.

import { t } from "./lib/i18n"
import { fetchMe } from "./lib/msgraph"

const ICON_URL = chrome.runtime.getURL("assets/icon.png")
const AUTH_KEY = "auth.ms"
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
const CLIENT_ID = "c9f320b3-a966-4bb7-8d88-3b51ae7f632f"
const DEFAULT_SCOPES = ["Tasks.ReadWrite", "User.Read", "offline_access"] as const
const SCOPES = DEFAULT_SCOPES.join(" ")
const TOKEN_REFRESH_ALARM = "token-refresh"

type AuthState = {
  accessToken?: string
  expiresAt?: number
  refreshToken?: string
}

async function getAuth(): Promise<AuthState> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_KEY], (res: any) => {
      resolve((res[AUTH_KEY] as AuthState) ?? {})
    })
  })
}

async function setAuth(state: AuthState): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AUTH_KEY]: state }, () => resolve())
  })
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
}> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${text}`)
  }
  return (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
}

// Proactively refresh token in background
async function backgroundRefreshToken() {
  try {
    const auth = await getAuth()
    if (!auth.refreshToken) {
      console.log("No refresh token available for background refresh")
      return
    }

    // Check if token needs refresh (5 minutes before expiry)
    const needsRefresh = auth.expiresAt ? Date.now() >= auth.expiresAt - 300_000 : true
    if (!needsRefresh && auth.accessToken) {
      console.log("Token still valid, skipping background refresh")
      return
    }

    console.log("Background token refresh initiated")
    const tokenResponse = await refreshAccessToken(auth.refreshToken)
    const next: AuthState = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? auth.refreshToken,
      expiresAt: Date.now() + (tokenResponse.expires_in ?? 3600) * 1000
    }
    await setAuth(next)
    console.log("Background token refresh successful")

    // Notify UI components that token has been refreshed
    chrome.runtime.sendMessage({ action: "token_refreshed", token: next.accessToken }).catch(() => {})
  } catch (error) {
    console.error("Background token refresh failed:", error)
  }
}

// Set up periodic token refresh alarm
chrome.alarms.get(TOKEN_REFRESH_ALARM, (alarm) => {
  if (!alarm) {
    // Check and refresh token every 30 minutes
    chrome.alarms.create(TOKEN_REFRESH_ALARM, { periodInMinutes: 30 })
  }
})

// Listen for alarm to trigger token refresh
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TOKEN_REFRESH_ALARM) {
    backgroundRefreshToken()
  }
})

// Also refresh on extension startup
backgroundRefreshToken()

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
    const title = t("notification_login_success_title")
    const message = username
      ? t("notification_login_success_message_named", username)
      : t("notification_login_success_message_generic")
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
            // Notify login success with resolved identity
            const who = newAccount.displayName || newAccount.upn || newAccount.id
            createBasicNotification(
              t("notification_login_success_title"),
              t("notification_login_success_message_named", who)
            )
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
    const { title = t("notification_error_title"), message = "" } = (msg as any) || {}
    createBasicNotification(title, message)
  }
})
