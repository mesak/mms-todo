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

// ✅ 關鍵改進: 使用 chrome.storage.local 實現跨 Context 和重開機持久化
// chrome.storage.local 在所有 Context (Popup, SidePanel, Background) 中共享
// 並且在瀏覽器關閉後依然保留數據

// 異步獲取認證狀態（主要使用）
async function getAuth(): Promise<AuthState> {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get([AUTH_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    console.warn("[useAuth] chrome.storage.local.get error:", chrome.runtime.lastError)
                    resolve({})
                    return
                }
                resolve(result[AUTH_KEY] || {})
            })
        } catch (e) {
            console.warn("[useAuth] Failed to get auth from chrome.storage.local:", e)
            resolve({})
        }
    })
}

// 異步設置認證狀態
async function setAuth(state: AuthState): Promise<void> {
    return new Promise((resolve) => {
        try {
            if (Object.keys(state).length === 0) {
                chrome.storage.local.remove([AUTH_KEY], () => {
                    if (chrome.runtime.lastError) {
                        console.warn("[useAuth] chrome.storage.local.remove error:", chrome.runtime.lastError)
                    }
                    resolve()
                })
            } else {
                chrome.storage.local.set({ [AUTH_KEY]: state }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn("[useAuth] chrome.storage.local.set error:", chrome.runtime.lastError)
                    }
                    resolve()
                })
            }
        } catch (e) {
            console.warn("[useAuth] Failed to set auth to chrome.storage.local:", e)
            resolve()
        }
    })
}

// 異步清除認證狀態
async function clearAuth(): Promise<void> {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.remove([AUTH_KEY], () => {
                if (chrome.runtime.lastError) {
                    console.warn("[useAuth] chrome.storage.local.remove error:", chrome.runtime.lastError)
                }
                resolve()
            })
        } catch (e) {
            console.warn("[useAuth] Failed to clear auth from chrome.storage.local:", e)
            resolve()
        }
    })
}

function parseHashParams(hash: string): Record<string, string> {
    const h = hash.startsWith("#") ? hash.slice(1) : hash
    const params = new URLSearchParams(h)
    const out: Record<string, string> = {}
    for (const [k, v] of params.entries()) out[k] = v
    return out
}

export function useAuth() {
    const [auth, setAuthState] = React.useState<AuthState>({})
    const [isLoading, setIsLoading] = React.useState(true)  // ✅ 需要初始加載狀態
    type AuthPhase = "initializing" | "refreshing" | "ready" | "prompt" | "error"
    type AuthFlowStep = "checking-token" | "checking-refresh-token" | "exchanging-new-token" | "done" | "error"
    const [phase, setPhase] = React.useState<AuthPhase>("initializing")
    const [flowStep, setFlowStep] = React.useState<AuthFlowStep | undefined>(undefined)

    // ✅ 關鍵改進: 從 chrome.storage.local 異步加載初始狀態
    React.useEffect(() => {
        let mounted = true
        
        async function loadInitialAuth() {
            try {
                const storedAuth = await getAuth()
                if (!mounted) return
                
                setAuthState(storedAuth)
                
                // 判定初始階段
                const expired = storedAuth.expiresAt ? Date.now() >= storedAuth.expiresAt - 30_000 : true
                const hasValid = !!storedAuth.accessToken && !expired
                
                if (hasValid) {
                    setPhase("ready")
                } else if (storedAuth.refreshToken) {
                    setPhase("refreshing")
                } else {
                    setPhase("prompt")
                }
            } catch (e) {
                console.error("[useAuth] Failed to load initial auth:", e)
                if (mounted) {
                    setPhase("prompt")
                }
            } finally {
                if (mounted) {
                    setIsLoading(false)
                }
            }
        }
        
        loadInitialAuth()
        
        return () => { mounted = false }
    }, [])

    // ✅ 關鍵改進: 監聽 chrome.storage.local 變化（跨 Context 同步）
    React.useEffect(() => {
        const handleStorageChange = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName !== "local") return
            if (!changes[AUTH_KEY]) return
            
            const newAuth = changes[AUTH_KEY].newValue || {}
            console.log("[useAuth] chrome.storage.local changed:", newAuth)
            setAuthState(newAuth)

            // 同時更新 phase 和 flowStep
            if (newAuth?.accessToken) {
                const expired = newAuth.expiresAt ? Date.now() >= newAuth.expiresAt - 30_000 : true
                setPhase(expired ? "refreshing" : "ready")
            } else {
                setPhase("prompt")
            }
            setFlowStep(undefined)
        }

        chrome.storage.onChanged.addListener(handleStorageChange)
        return () => chrome.storage.onChanged.removeListener(handleStorageChange)
    }, [])

    // ✅ 改進 2.5: 監聽其他擴展 Context 的消息（更新 auth_changed 和 logout_completed）
    React.useEffect(() => {
        const listener = (message: any, sender: chrome.runtime.MessageSender, respond: (response?: any) => void) => {
            if (message.action === "auth_changed") {
                // 其他 Context 的認證狀態已變化，完整更新所有狀態
                const newAuth = message.auth as AuthState
                console.log("[useAuth] Received auth_changed message", newAuth)
                setAuthState(newAuth)

                // 同時更新 phase 和 flowStep
                if (newAuth?.accessToken) {
                    const expired = newAuth.expiresAt ? Date.now() >= newAuth.expiresAt - 30_000 : true
                    setPhase(expired ? "refreshing" : "ready")
                } else {
                    setPhase("prompt")
                }
                setFlowStep(undefined)
            }

            // ✅ 新增：處理登出完成消息
            if (message.action === "logout_completed") {
                console.log("[useAuth] Received logout_completed message")
                setAuthState({})
                setPhase("prompt")
                setFlowStep(undefined)
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
        console.log("[useAuth] Login started")
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
        // ✅ 登入後立即更新所有狀態和通知
        console.log("[useAuth] Login token exchange successful, updating state", { accessToken: next.accessToken?.substring(0, 10), expiresAt: next.expiresAt })
        await setAuth(next)  // ✅ 使用異步版本
        setAuthState(next)
        console.log("[useAuth] Auth state updated, setting phase to ready")
        setPhase("ready")
        setFlowStep("done")
        localStorage.removeItem("login_state")

        // 通知其他 Context（2 種方式確保同步）
        // 1. 先通知 background.ts 執行帳號檢查和緩存清除
        try {
            await chrome.runtime.sendMessage({
                action: "login_completed_with_token",
                access_token: token.access_token,
                auth: next
            })
        } catch { }

        // 2. 立即發送 auth_changed 消息確保所有 Context 立即更新
        // （不要等 background.ts 的回應）
        setTimeout(() => {
            try {
                chrome.runtime.sendMessage({
                    action: "auth_changed",
                    auth: next
                }).catch(() => { })
            } catch { }
        }, 100)

        // 清除登入完成提示
        setTimeout(() => setFlowStep(undefined), 800)
    }, [])

    const logout = React.useCallback(async () => {
        console.log("[useAuth] Logout started")
        // ✅ 完整的登出流程（清除所有狀態）

        // 1. 清除 localStorage 中的臨時數據
        localStorage.removeItem("login_state")
        localStorage.removeItem("ms_account")

        // 2. 清除 React Query 緩存（rq-mms-todo）
        localStorage.removeItem("rq-mms-todo")

        // 3. 清除 chrome.storage.local 中的認證和用戶數據
        try {
            await clearAuth()  // ✅ 使用異步版本
            await new Promise<void>((resolve) => {
                chrome.storage.local.remove(["ms_account", "todos", "categories"], () => {
                    console.log("[useAuth] Cleared chrome.storage.local directly")
                    resolve()
                })
            })
        } catch (e) {
            console.error("[useAuth] Failed to clear chrome.storage.local:", e)
        }

        // 4. 清除本地 React 狀態
        console.log("[useAuth] Clearing auth state, setting phase to prompt")
        setAuthState({})
        setPhase("prompt")
        setFlowStep(undefined)

        // 5. 通知 background.ts 執行清除操作（額外保險）
        try {
            await chrome.runtime.sendMessage({
                action: "logout_initiated"
            })
        } catch { }

        // 6. 發送 account_changed 消息以觸發所有 Context 的 React Query 緩存清除
        try {
            await chrome.runtime.sendMessage({
                action: "account_changed",
                account: null  // null 表示已登出
            })
        } catch { }

        // 7. 通知其他 Context 清除認證狀態
        try {
            await chrome.runtime.sendMessage({
                action: "logout_completed"
            })
        } catch { }

        console.log("Logout completed: all state cleared")
    }, [])

    // ✅ 更好的 ensureValidToken
    const ensureValidToken = React.useCallback(async (): Promise<string | undefined> => {
        const current = await getAuth()  // ✅ 使用異步版本
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
                await setAuth(next)  // ✅ 使用異步版本
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
                // ✅ 只在 invalid_grant 時清除，其他錯誤返回 undefined（讓 caller 決定）
                if (e instanceof Error && e.message.includes("invalid_grant")) {
                    await clearAuth()  // ✅ 使用異步版本
                    setAuthState({})
                    setPhase("prompt")
                }
                return undefined
            }
        }

        return undefined
    }, [])

    // ✅ 改進的自動刷新邏輯，帶有更好的錯誤恢復
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
                    await setAuth(next)  // ✅ 使用異步版本
                    setAuthState(next)
                    setPhase("ready")
                    setFlowStep("done")
                    setTimeout(() => setFlowStep(undefined), 600)

                    // ✅ 計算下一次刷新時間
                    const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
                    refreshTimer = setTimeout(() => {
                        if (!cancelled) maybeRefresh()
                    }, timeUntilRefresh)
                } catch (e) {
                    console.error("Token refresh failed:", e)
                    // ✅ 只有真正的無效 Token 才清除，其他錯誤保持狀態
                    if (e instanceof Error && e.message.includes("invalid_grant")) {
                        await clearAuth()  // ✅ 使用異步版本
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
