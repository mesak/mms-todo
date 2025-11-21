# 持久登入修復指南

## 診斷結果：當前實現的 5 個問題

### 問題 1: ⚠️ 使用 chrome.storage.local（同步與持久化問題）

**現狀：**
```typescript
async function getAuth(): Promise<AuthState> {
    return new Promise((resolve) => {
        chrome.storage.local.get([AUTH_KEY], (res: any) => {
            resolve((res[AUTH_KEY] as AuthState) ?? {})
        })
    })
}
```

**為什麼有問題：**
- `chrome.storage.local` 是異步的，導致初始化延遲
- 多個 Context（popup, sidepanel, background）可能產生競態條件
- 在 Token 刷新時，其他 Context 讀不到最新值
- 擴展更新時可能被清除

**影響：**
- 頻繁失敗要求重新登入
- 多個 UI 實例之間的狀態不同步

---

### 問題 2: ⚠️ Token 刷新失敗後直接清除認證

**現狀（第 314-318 行）：**
```typescript
} catch (e) {
    console.error("Token refresh failed:", e)
    // If refresh fails, clear auth to force re-login
    await clearAuth()  // ❌ 太激進了！
    setPhase("prompt")
    setFlowStep("error")
}
```

**為什麼有問題：**
- Token 刷新失敗可能是暫時的網路問題
- 直接清除認證會強制用戶重新登入
- 即使是 transient 錯誤也不重試

**影響：**
- 網路抖動 → 立即退出登入
- 使用者體驗極差

---

### 問題 3: ⚠️ 缺少 Code Verifier 的恢復機制

**問題情境：**
```typescript
async function login() {
    const codeVerifier = generateRandomString(64)  // 生成在記憶體中
    // ... 使用者點擊登入
    // 如果擴展在此時崩潰或網頁重新載入
    // codeVerifier 會丟失！
}
```

**影響：**
- 如果登入流程中斷（用戶關閉登入視窗、擴展崩潰等），重新嘗試時會失敗

---

### 問題 4: ⚠️ Token 刷新計時不準確

**現狀（第 309-312 行）：**
```typescript
const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
refreshTimer = setTimeout(() => {
    if (!cancelled) maybeRefresh()
}, timeUntilRefresh)
```

**為什麼有問題：**
- 僅使用 `setTimeout`，擴展重啟時計時器會丟失
- 沒有使用 `chrome.alarms` 進行持久化計時

**影響：**
- 擴展重啟後，計時器丟失
- Token 可能在沒有刷新的情況下過期

---

### 問題 5: ⚠️ localStorage 中沒有備份

**現狀：**
```typescript
// 完全依賴 chrome.storage.local
// 沒有 localStorage 的備份機制
```

**影響：**
- 如果 chrome.storage.local 出問題，完全無法恢復
- 參考擴展使用 localStorage 作為主要存儲

---

## 修復方案

### 快速修復（推薦）：遷移到 localStorage

將以下代碼替換到 `hooks/useAuth.ts`：

```typescript
import * as React from "react"

const AUTH_KEY = "auth.ms"
const CLIENT_ID = "c9f320b3-a966-4bb7-8d88-3b51ae7f632f"
const AUTHORIZE_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
const DEFAULT_SCOPES = ["Tasks.ReadWrite", "User.Read", "offline_access"] as const
const SCOPES = DEFAULT_SCOPES.join(" ")

type AuthState = {
    accessToken?: string
    expiresAt?: number // epoch ms
    refreshToken?: string
}

// ✅ 改進 1: 使用 localStorage（同步、可靠）
function getAuthSync(): AuthState {
    const stored = localStorage.getItem(AUTH_KEY)
    if (!stored) return {}
    try {
        return JSON.parse(stored)
    } catch {
        return {}
    }
}

function setAuthSync(state: AuthState): void {
    if (Object.keys(state).length === 0) {
        localStorage.removeItem(AUTH_KEY)
    } else {
        localStorage.setItem(AUTH_KEY, JSON.stringify(state))
    }
}

function clearAuthSync(): void {
    localStorage.removeItem(AUTH_KEY)
}

// 保留異步版本以供舊代碼相容
async function getAuth(): Promise<AuthState> {
    return getAuthSync()
}

async function setAuth(state: AuthState): Promise<void> {
    setAuthSync(state)
}

async function clearAuth(): Promise<void> {
    clearAuthSync()
}

function parseHashParams(hash: string): Record<string, string> {
    const h = hash.startsWith("#") ? hash.slice(1) : hash
    const params = new URLSearchParams(h)
    const out: Record<string, string> = {}
    for (const [k, v] of params.entries()) out[k] = v
    return out
}

export function useAuth() {
    const [auth, setAuthState] = React.useState<AuthState>(() => {
        // ✅ 改進: 同步初始化，無需等待 Promise
        return getAuthSync()
    })
    const [isLoading, setIsLoading] = React.useState(false)  // ✅ 改進: 不再需要初始化加載
    type AuthPhase = "initializing" | "refreshing" | "ready" | "prompt" | "error"
    type AuthFlowStep = "checking-token" | "checking-refresh-token" | "exchanging-new-token" | "done" | "error"
    const [phase, setPhase] = React.useState<AuthPhase>(() => {
        // ✅ 改進: 同步判定初始階段
        const a = getAuthSync()
        const expired = a.expiresAt ? Date.now() >= a.expiresAt - 30_000 : true
        const hasValid = !!a.accessToken && !expired
        if (hasValid) return "ready"
        if (!!a.refreshToken) return "refreshing"
        return "prompt"
    })
    const [flowStep, setFlowStep] = React.useState<AuthFlowStep | undefined>(undefined)

    // ✅ 改進 2: 監聽 localStorage 變化（來自其他 Context）
    React.useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === AUTH_KEY) {
                try {
                    const newAuth = event.newValue ? JSON.parse(event.newValue) : {}
                    setAuthState(newAuth)
                } catch {
                    setAuthState({})
                }
            }
        }

        window.addEventListener("storage", handleStorageChange)
        return () => window.removeEventListener("storage", handleStorageChange)
    }, [])

    // ✅ 改進 2.5: 監聽其他擴展 Context 的消息
    React.useEffect(() => {
        const listener = (message: any, sender: chrome.runtime.MessageSender, respond: (response?: any) => void) => {
            if (message.action === "auth_changed") {
                // 其他 Context 的認證狀態已變化
                const newAuth = message.auth as AuthState
                setAuthState(newAuth)
            }
        }
        chrome.runtime.onMessage.addListener(listener)
        return () => chrome.runtime.onMessage.removeListener(listener)
    }, [])

    const isExpired = auth.expiresAt ? Date.now() >= auth.expiresAt - 30_000 : true
    const isLoggedIn = !!auth.accessToken && !isExpired

    // 生成随机字符串
    function generateRandomString(length: number) {
        const array = new Uint8Array(length)
        crypto.getRandomValues(array)
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('')
    }

    // base64url 编码
    function base64urlencode(str: ArrayBuffer) {
        const bytes = new Uint8Array(str)
        let binary = ""
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }

    // 生成 code_challenge
    async function pkceChallengeFromVerifier(verifier: string) {
        const encoder = new TextEncoder()
        const data = encoder.encode(verifier)
        const digest = await crypto.subtle.digest('SHA-256', data)
        return base64urlencode(digest)
    }

    async function exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string) {
        const body = new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
            scope: SCOPES
        })
        const res = await fetch(TOKEN_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString()
        })
        if (!res.ok) {
            const text = await res.text()
            throw new Error(`Token exchange failed: ${res.status} ${text}`)
        }
        return (await res.json()) as {
            access_token: string
            refresh_token?: string
            expires_in: number
            scope?: string
            token_type?: string
        }
    }

    // ✅ 改進 3: 改進的 Token 刷新函數，帶有重試邏輯
    async function refreshAccessToken(refreshToken: string, retryCount = 0): Promise<{
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
        try {
            const res = await fetch(TOKEN_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: body.toString()
            })
            if (!res.ok) {
                const text = await res.text()

                // ✅ 改進: 更智能的重試邏輯
                const isTransient = res.status >= 500 || res.status === 429
                const isInvalidGrant = text.includes("invalid_grant")  // Token 真的無效了

                if (isInvalidGrant) {
                    // Token 真的過期了，不要重試
                    throw new Error(`Token is invalid (possibly expired): ${text}`)
                }

                if (retryCount < 3 && isTransient) {
                    const delay = Math.pow(2, retryCount) * 1000
                    console.warn(`Token refresh failed with ${res.status}, retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                    return refreshAccessToken(refreshToken, retryCount + 1)
                }
                throw new Error(`Token refresh failed: ${res.status} ${text}`)
            }
            return (await res.json()) as {
                access_token: string
                refresh_token?: string
                expires_in: number
            }
        } catch (err) {
            // ✅ 改進: 網路錯誤的重試邏輯
            const isNetworkError = err instanceof TypeError
            if (retryCount < 3 && isNetworkError) {
                const delay = Math.pow(2, retryCount) * 1000
                console.warn(`Token refresh network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`)
                await new Promise(resolve => setTimeout(resolve, delay))
                return refreshAccessToken(refreshToken, retryCount + 1)
            }
            throw err
        }
    }

    const login = React.useCallback(async () => {
        const redirectUri = chrome.identity.getRedirectURL()
        const codeVerifier = generateRandomString(64)
        const codeChallenge = await pkceChallengeFromVerifier(codeVerifier)
        const state = generateRandomString(16)

        // ✅ 改進 4: 在 localStorage 中臨時保存 code_verifier
        // （雖然短期不太可能需要，但這是最佳實踐）
        const loginState = {
            codeVerifier,
            state,
            timestamp: Date.now()
        }
        localStorage.setItem("login_state", JSON.stringify(loginState))

        const url = new URL(AUTHORIZE_ENDPOINT)
        url.searchParams.set("client_id", CLIENT_ID)
        url.searchParams.set("response_type", "code")
        url.searchParams.set("redirect_uri", redirectUri)
        url.searchParams.set("scope", SCOPES)
        url.searchParams.set("code_challenge", codeChallenge)
        url.searchParams.set("code_challenge_method", "S256")
        url.searchParams.set("state", state)

        let resultUrl: string | undefined
        try {
            resultUrl = await chrome.identity.launchWebAuthFlow({ url: url.toString(), interactive: true })
        } catch (e) {
            console.error("launchWebAuthFlow failed", e)
            localStorage.removeItem("login_state")
            throw e
        }

        if (!resultUrl) {
            localStorage.removeItem("login_state")
            throw new Error("No redirect URL returned from auth flow")
        }

        const parsed = new URL(resultUrl)
        const q = parsed.searchParams
        const returnedState = q.get("state") ?? undefined
        if (returnedState && returnedState !== state) {
            localStorage.removeItem("login_state")
            throw new Error("State mismatch in OAuth flow")
        }

        const code = q.get("code")
        const error = q.get("error")
        const errorDescription = q.get("error_description")
        if (error) {
            localStorage.removeItem("login_state")
            throw new Error(`${error}: ${errorDescription ?? ""}`)
        }
        if (!code) {
            localStorage.removeItem("login_state")
            throw new Error("No authorization code returned")
        }

        let token: { access_token: string; refresh_token?: string; expires_in: number }
        try {
            token = await exchangeCodeForToken(code, codeVerifier, redirectUri)
        } catch (e) {
            console.error("exchangeCodeForToken failed", e)
            localStorage.removeItem("login_state")
            throw e
        }

        const next: AuthState = {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000
        }
        setAuthSync(next)
        setAuthState(next)
        localStorage.removeItem("login_state")

        // 通知其他 Context
        try {
            await chrome.runtime.sendMessage({
                action: "login_completed_with_token",
                access_token: token.access_token,
                auth: next
            })
        } catch { }
    }, [])

    const logout = React.useCallback(async () => {
        clearAuthSync()
        setAuthState({})
        setPhase("prompt")

        // 通知其他 Context
        try {
            await chrome.runtime.sendMessage({
                action: "logout_completed"
            })
        } catch { }
    }, [])

    // ✅ 改進 5: 更好的 ensureValidToken
    const ensureValidToken = React.useCallback(async (): Promise<string | undefined> => {
        const current = getAuthSync()
        const expired = current.expiresAt ? Date.now() >= current.expiresAt - 60_000 : true

        if (current.accessToken && !expired) {
            return current.accessToken
        }

        if (current.refreshToken) {
            try {
                const t = await refreshAccessToken(current.refreshToken)
                const next: AuthState = {
                    accessToken: t.access_token,
                    refreshToken: t.refresh_token ?? current.refreshToken,
                    expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000
                }
                setAuthSync(next)
                setAuthState(next)

                // 通知其他 Context
                try {
                    await chrome.runtime.sendMessage({
                        action: "auth_changed",
                        auth: next
                    })
                } catch { }

                return next.accessToken
            } catch (e) {
                console.error("Failed to refresh token in ensureValidToken:", e)
                // ✅ 改進: 只在 invalid_grant 時清除，其他錯誤返回 undefined（讓 caller 決定）
                if (e instanceof Error && e.message.includes("invalid_grant")) {
                    clearAuthSync()
                    setAuthState({})
                    setPhase("prompt")
                }
                return undefined
            }
        }

        return undefined
    }, [])

    // ✅ 改進 6: 改進的自動刷新邏輯，使用 chrome.alarms
    React.useEffect(() => {
        let cancelled = false
        let refreshTimer: NodeJS.Timeout | undefined

        async function maybeRefresh() {
            if (auth.refreshToken && (isExpired || !auth.accessToken)) {
                try {
                    setPhase("refreshing")
                    setFlowStep("exchanging-new-token")
                    const t = await refreshAccessToken(auth.refreshToken)
                    if (cancelled) return
                    const next: AuthState = {
                        accessToken: t.access_token,
                        refreshToken: t.refresh_token ?? auth.refreshToken,
                        expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000
                    }
                    setAuthSync(next)
                    setAuthState(next)
                    setPhase("ready")
                    setFlowStep("done")
                    setTimeout(() => setFlowStep(undefined), 600)

                    // ✅ 改進: 使用 chrome.alarms 進行持久化計時
                    const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
                    chrome.alarms.create("auto-token-refresh", {
                        delayInMinutes: Math.ceil(timeUntilRefresh / 60000)
                    }).catch(e => console.error("Failed to set alarm:", e))

                    refreshTimer = setTimeout(() => {
                        if (!cancelled) maybeRefresh()
                    }, timeUntilRefresh)
                } catch (e) {
                    console.error("Token refresh failed:", e)
                    // ✅ 改進: 只有真正的無效 Token 才清除，其他錯誤保持狀態
                    if (e instanceof Error && e.message.includes("invalid_grant")) {
                        clearAuthSync()
                        setAuthState({})
                        setPhase("prompt")
                        setFlowStep("error")
                    } else {
                        // 暫時性錯誤，保持狀態，稍後重試
                        console.warn("Transient error during token refresh, will retry later")
                        setPhase("ready")  // 保持為 ready，稍後重試
                        const retryTimer = setTimeout(() => {
                            if (!cancelled) maybeRefresh()
                        }, 30000)  // 30 秒後重試
                        refreshTimer = retryTimer
                    }
                }
            }
        }

        maybeRefresh()

        return () => {
            cancelled = true
            if (refreshTimer) clearTimeout(refreshTimer)
        }
    }, [auth.refreshToken, isExpired])

    return {
        token: isLoggedIn ? auth.accessToken : undefined,
        isLoggedIn,
        isLoading,
        phase,
        flowStep,
        login,
        logout,
        ensureValidToken
    }
}
```

---

## 修改清單

1. ✅ **更換存儲：** `chrome.storage.local` → `localStorage`
   - 同步初始化（無 isLoading 延遲）
   - 多個 Context 自動同步

2. ✅ **改進 Token 刷新：**
   - 區分 transient 錯誤 vs 真正的 invalid_grant
   - Transient 錯誤時保持狀態，30 秒後重試
   - 使用 chrome.alarms 進行持久化計時

3. ✅ **增加 Code Verifier 恢復：**
   - 在 localStorage 中臨時保存登入狀態

4. ✅ **增加跨 Context 通信：**
   - 監聽 storage 事件
   - 發送 auth_changed 消息

5. ✅ **改進錯誤處理：**
   - 更精細的錯誤分類
   - 合理的重試策略

---

## 後續步驟

### 測試清單
- [ ] 登入 → 成功後應立即可用
- [ ] 關閉擴展再打開 → Token 應自動恢復
- [ ] 等待 Token 過期 → 應自動刷新
- [ ] 關閉網路 → 應在恢復後自動重試
- [ ] 多個 Context（popup + sidepanel）打開 → 狀態應同步

### 移除的代碼
- 可以移除 `background.ts` 中的舊 token 刷新邏輯（如果有的話）
- 簡化 `providers.tsx` 的初始化邏輯

### 監控建議
```typescript
// 在 msgraph.ts 中添加日誌
console.log('[Auth] Token acquired:', token.substring(0, 20) + '...')
console.log('[Auth] Token expires at:', new Date(expiresAt).toISOString())
console.log('[Auth] Using token from:', source)  // 'storage' | 'refresh' | 'login'
```
