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

async function clearAuth(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.remove([AUTH_KEY], () => resolve())
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
    const [isLoading, setIsLoading] = React.useState(true)
    type AuthPhase = "initializing" | "refreshing" | "ready" | "prompt" | "error"
    type AuthFlowStep = "checking-token" | "checking-refresh-token" | "exchanging-new-token" | "done" | "error"
    const [phase, setPhase] = React.useState<AuthPhase>("initializing")
    const [flowStep, setFlowStep] = React.useState<AuthFlowStep | undefined>(undefined)

    React.useEffect(() => {
        let mounted = true
        setPhase("initializing")
        setFlowStep("checking-token")
        getAuth().then((a) => {
            if (!mounted) return
            setAuthState(a)
            setIsLoading(false)
            const expired = a.expiresAt ? Date.now() >= a.expiresAt - 30_000 : true
            const hasValid = !!a.accessToken && !expired
            if (hasValid) {
                setPhase("ready")
                setFlowStep("done")
                // Clear step indicator shortly after
                setTimeout(() => setFlowStep(undefined), 600)
            } else if (!!a.refreshToken) {
                setPhase("refreshing")
                setFlowStep("checking-refresh-token")
            } else {
                setPhase("prompt")
                setFlowStep(undefined)
            }
        })
        const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
            if (area !== "local") return
            if (Object.prototype.hasOwnProperty.call(changes, AUTH_KEY)) {
                const v = changes[AUTH_KEY]
                setAuthState((v?.newValue as AuthState) ?? {})
            }
        }
        chrome.storage.onChanged.addListener(listener)
        return () => {
            mounted = false
            chrome.storage.onChanged.removeListener(listener)
        }
    }, [])

    const isExpired = auth.expiresAt ? Date.now() >= auth.expiresAt - 30_000 : true
    const isLoggedIn = !!auth.accessToken && !isExpired

    // 生成随机字符串
    function generateRandomString(length: number) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
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
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return base64urlencode(digest);
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
                // Retry on network errors or transient server errors
                if (retryCount < 2 && (res.status >= 500 || res.status === 429)) {
                    console.warn(`Token refresh failed with ${res.status}, retrying... (attempt ${retryCount + 1}/3)`)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
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
            // Retry on network errors
            if (retryCount < 2 && (err instanceof TypeError)) {
                console.warn(`Token refresh network error, retrying... (attempt ${retryCount + 1}/3)`)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
                return refreshAccessToken(refreshToken, retryCount + 1)
            }
            throw err
        }
    }

    const login = React.useCallback(async () => {
        // IMPORTANT: Ensure this redirect URL is registered in your Azure App's Redirect URIs:
        // e.g. https://<extension-id>.chromiumapp.org/
        // Use a fixed path segment to match Azure AD redirect URI registration
        // const redirectUri = chrome.identity.getRedirectURL("oauth2")
        const redirectUri = chrome.identity.getRedirectURL()

        const codeVerifier = generateRandomString(64);
        const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);
        const state = generateRandomString(16)

        const url = new URL(AUTHORIZE_ENDPOINT)
        url.searchParams.set("client_id", CLIENT_ID)
        url.searchParams.set("response_type", "code")
        url.searchParams.set("redirect_uri", redirectUri)
        url.searchParams.set("scope", SCOPES)
        url.searchParams.set("code_challenge", codeChallenge)
        url.searchParams.set("code_challenge_method", "S256")
        url.searchParams.set("state", state)
        // console.log('auth url', url.toString())

        let resultUrl: string | undefined
        try {
            resultUrl = await chrome.identity.launchWebAuthFlow({ url: url.toString(), interactive: true })
        } catch (e) {
            console.error("launchWebAuthFlow failed", e)
            throw e
        }
        if (!resultUrl) throw new Error("No redirect URL returned from auth flow")

        const parsed = new URL(resultUrl)
        const q = parsed.searchParams
        const returnedState = q.get("state") ?? undefined
        if (returnedState && returnedState !== state) {
            throw new Error("State mismatch in OAuth flow")
        }
        const code = q.get("code")
        const error = q.get("error")
        const errorDescription = q.get("error_description")
        if (error) throw new Error(`${error}: ${errorDescription ?? ""}`)
        if (!code) throw new Error("No authorization code returned")

        let token: { access_token: string; refresh_token?: string; expires_in: number }
        try {
            token = await exchangeCodeForToken(code, codeVerifier, redirectUri)
        } catch (e) {
            console.error("exchangeCodeForToken failed", e)
            throw e
        }
        const next: AuthState = {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000
        }
        await setAuth(next)
        // Inform background with the fresh token so it can resolve /me, set ms_account,
        // clear user-scoped data on account change, and broadcast to UIs.
        try {
            await chrome.runtime.sendMessage({ action: "login_completed_with_token", access_token: token.access_token })
        } catch { }
    }, [])

    const logout = React.useCallback(async () => {
        await clearAuth()
    }, [])

    // Proactively ensure we have a valid token, refreshing if necessary
    const ensureValidToken = React.useCallback(async (): Promise<string | undefined> => {
        const current = await getAuth()
        const expired = current.expiresAt ? Date.now() >= current.expiresAt - 60_000 : true
        
        // If we have a valid token, return it
        if (current.accessToken && !expired) {
            return current.accessToken
        }
        
        // If we have a refresh token, try to refresh
        if (current.refreshToken) {
            try {
                const t = await refreshAccessToken(current.refreshToken)
                const next: AuthState = {
                    accessToken: t.access_token,
                    refreshToken: t.refresh_token ?? current.refreshToken,
                    expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000
                }
                await setAuth(next)
                return next.accessToken
            } catch (e) {
                console.error("Failed to refresh token in ensureValidToken:", e)
                // If refresh fails, clear auth
                await clearAuth()
                return undefined
            }
        }
        
        return undefined
    }, [])

    // Attempt silent refresh when token is expired and refresh token exists
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
                    await setAuth(next)
                    setPhase("ready")
                    setFlowStep("done")
                    setTimeout(() => setFlowStep(undefined), 600)
                    
                    // Schedule next refresh 5 minutes before expiration
                    const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
                    refreshTimer = setTimeout(() => {
                        if (!cancelled) maybeRefresh()
                    }, timeUntilRefresh)
                } catch (e) {
                    console.error("Token refresh failed:", e)
                    // If refresh fails, clear auth to force re-login
                    await clearAuth()
                    setPhase("prompt")
                    setFlowStep("error")
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
