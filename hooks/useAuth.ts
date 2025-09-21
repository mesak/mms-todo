import * as React from "react"

const AUTH_KEY = "auth.ms"

type AuthState = {
    accessToken?: string
    expiresAt?: number // epoch ms
    refreshToken?: string
}

async function getAuth(): Promise<AuthState> {
    return new Promise((resolve) => {
        chrome.storage.local.get([AUTH_KEY], (res) => {
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

    React.useEffect(() => {
        let mounted = true
        getAuth().then((a) => {
            if (!mounted) return
            setAuthState(a)
            setIsLoading(false)
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
        const tokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        const clientId = "c9f320b3-a966-4bb7-8d88-3b51ae7f632f"
        const scope = ["Tasks.ReadWrite", "User.Read", "offline_access"].join(" ")
        const body = new URLSearchParams({
            client_id: clientId,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
            scope
        })
        const res = await fetch(tokenEndpoint, {
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

    async function refreshAccessToken(refreshToken: string) {
        const tokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        const clientId = "c9f320b3-a966-4bb7-8d88-3b51ae7f632f"
        const scope = ["Tasks.ReadWrite", "User.Read", "offline_access"].join(" ")
        const body = new URLSearchParams({
            client_id: clientId,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            scope
        })
        const res = await fetch(tokenEndpoint, {
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

    const login = React.useCallback(async () => {
        // IMPORTANT: Ensure this redirect URL is registered in your Azure App's Redirect URIs:
        // e.g. https://<extension-id>.chromiumapp.org/
    const redirectUri = chrome.identity.getRedirectURL()

        // Microsoft OAuth 2.0 authorize endpoint (v2):
        const authorizeEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"

        // Client ID must match your Azure App Registration
        const clientId = "c9f320b3-a966-4bb7-8d88-3b51ae7f632f"

        // Scopes needed for Microsoft To Do
        const scope = [
            "Tasks.ReadWrite",
            "User.Read",
            "offline_access"
        ].join(" ")

        const codeVerifier = generateRandomString(64);
        const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);
        const state = generateRandomString(16)
        
        const url = new URL(authorizeEndpoint)
        url.searchParams.set("client_id", clientId)
        url.searchParams.set("response_type", "code")
        url.searchParams.set("redirect_uri", redirectUri)
        url.searchParams.set("scope", scope)
        url.searchParams.set("code_challenge", codeChallenge)
        url.searchParams.set("code_challenge_method", "S256")
        url.searchParams.set("state", state)
    console.log('auth url', url.toString())

        const resultUrl = await chrome.identity.launchWebAuthFlow({ url: url.toString(), interactive: true })
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

        const token = await exchangeCodeForToken(code, codeVerifier, redirectUri)
        const next: AuthState = {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000
        }
        await setAuth(next)
    }, [])

    const logout = React.useCallback(async () => {
        await clearAuth()
    }, [])

    // Attempt silent refresh when token is expired and refresh token exists
    React.useEffect(() => {
        let cancelled = false
        async function maybeRefresh() {
            if (auth.refreshToken && (isExpired || !auth.accessToken)) {
                try {
                    const t = await refreshAccessToken(auth.refreshToken)
                    if (cancelled) return
                    const next: AuthState = {
                        accessToken: t.access_token,
                        refreshToken: t.refresh_token ?? auth.refreshToken,
                        expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000
                    }
                    await setAuth(next)
                } catch (e) {
                    // If refresh fails, clear auth to force re-login
                    await clearAuth()
                }
            }
        }
        maybeRefresh()
        return () => {
            cancelled = true
        }
    }, [auth.refreshToken, isExpired])

    return {
        token: isLoggedIn ? auth.accessToken : undefined,
        isLoggedIn,
        isLoading,
        login,
        logout
    }
}
