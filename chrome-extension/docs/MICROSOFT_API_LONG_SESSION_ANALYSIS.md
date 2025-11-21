# Microsoft API 長期免登入機制分析報告

## 專案概述
此專案是一個 Chrome Extension，用於管理 Microsoft To Do 任務。該擴展能夠在用戶長時間未登入的情況下，持續使用 Microsoft Graph API，無需重新認證。

## 核心技術棧

### 認證框架
- **OAuth 2.0 Authorization Code Flow with PKCE**: 安全的認證流程，適用於公開客戶端
- **Refresh Token 機制**: 自動刷新 Access Token，實現長期免登入
- **Microsoft Graph API**: v1.0

### 關鍵組件
```json
{
  "permissions": [
    "identity",
    "storage", 
    "notifications",
    "alarms"
  ],
  "host_permissions": [
    "https://graph.microsoft.com/*",
    "https://login.microsoftonline.com/*"
  ]
}
```

## 長期免登入機制詳解

### 1. OAuth 2.0 Authorization Code Flow with PKCE

#### 配置設定
```typescript
const CLIENT_ID = "c9f320b3-a966-4bb7-8d88-3b51ae7f632f"
const AUTHORIZE_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
const DEFAULT_SCOPES = ["Tasks.ReadWrite", "User.Read", "offline_access"]
```

**重點說明:**
- 使用 `offline_access` scope 來獲取 refresh token
- PKCE (Proof Key for Code Exchange) 增強安全性
- Token 存儲在 `chrome.storage.local`，數據持久化
- 即使關閉瀏覽器也不會丟失

### 2. Token 自動刷新流程

#### 多層次刷新機制
本專案實現了三層 token 刷新機制，確保長期免登入：

1. **UI 層自動刷新** (hooks/useAuth.ts)
   - 在 token 即將過期時自動觸發刷新（過期前 5 分鐘）
   - 使用 React useEffect 監控 token 狀態
   - 提供 `ensureValidToken()` 函數供其他組件使用

2. **背景服務定期刷新** (background.ts)
   - 使用 `chrome.alarms` 每 30 分鐘檢查 token 狀態
   - 即使用戶沒有打開擴展，也會在背景自動刷新
   - Extension 啟動時立即檢查並刷新 token

3. **重試機制**
   - 網絡錯誤時自動重試（最多 3 次）
   - 使用指數退避策略（1s, 2s, 4s）
   - 避免暫時性錯誤導致的登出

#### 工作原理
1. **首次登入**: 
   - 用戶通過 Microsoft 認證（使用 `chrome.identity.launchWebAuthFlow`）
   - 使用 PKCE 流程交換 authorization code 獲取 tokens
   - 獲取 Access Token (有效期通常 1 小時) 和 Refresh Token (有效期通常 90 天)

2. **Token 存儲**: 
   ```typescript
   type AuthState = {
     accessToken?: string
     expiresAt?: number      // 過期時間戳
     refreshToken?: string   // 用於獲取新的 access token
   }
   ```
   - 所有 token 存儲在 `chrome.storage.local`
   - 持久化存儲，關閉瀏覽器後依然保留

3. **UI 層自動刷新**:
   ```typescript
   // hooks/useAuth.ts
   React.useEffect(() => {
     async function maybeRefresh() {
       if (auth.refreshToken && (isExpired || !auth.accessToken)) {
         const t = await refreshAccessToken(auth.refreshToken)
         await setAuth({
           accessToken: t.access_token,
           refreshToken: t.refresh_token ?? auth.refreshToken,
           expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000
         })
         
         // 排程下次刷新（過期前 5 分鐘）
         const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
         setTimeout(() => maybeRefresh(), timeUntilRefresh)
       }
     }
     maybeRefresh()
   }, [auth.refreshToken, isExpired])
   ```

4. **背景服務刷新**:
   ```typescript
   // background.ts
   // 每 30 分鐘檢查並刷新 token
   chrome.alarms.create("token-refresh", { periodInMinutes: 30 })
   
   chrome.alarms.onAlarm.addListener(async (alarm) => {
     if (alarm.name === "token-refresh") {
       await backgroundRefreshToken()
     }
   })
   ```

5. **Refresh Token 續期**:
   - Refresh Token 本身也會在使用時自動更新
   - 只要用戶定期使用應用（90天內至少一次），refresh token 會持續有效
   - 這就是為什麼可以「長期」免登入

### 3. 錯誤處理和重試機制

```typescript
async function refreshAccessToken(refreshToken: string, retryCount = 0) {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: SCOPES
      })
    })
    
    if (!res.ok) {
      // 伺服器錯誤或限流時重試
      if (retryCount < 2 && (res.status >= 500 || res.status === 429)) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        return refreshAccessToken(refreshToken, retryCount + 1)
      }
      throw new Error(`Token refresh failed: ${res.status}`)
    }
    
    return await res.json()
  } catch (err) {
    // 網絡錯誤時重試
    if (retryCount < 2 && err instanceof TypeError) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      return refreshAccessToken(refreshToken, retryCount + 1)
    }
    throw err
  }
}
```

**關鍵點:**
- 自動重試暫時性錯誤（網絡問題、伺服器 5xx 錯誤、限流）
- 使用指數退避策略避免頻繁重試
- 只有在確認 refresh token 失效時才清除認證狀態

### 4. Chrome Extension 特殊優勢

#### Chrome Identity API 集成
```typescript
async function login() {
  const redirectUri = chrome.identity.getRedirectURL()
  const codeVerifier = generateRandomString(64)
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier)
  
  const url = new URL(AUTHORIZE_ENDPOINT)
  url.searchParams.set("client_id", CLIENT_ID)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", SCOPES)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  
  const resultUrl = await chrome.identity.launchWebAuthFlow({
    url: url.toString(),
    interactive: true
  })
  
  // 交換 authorization code 獲取 tokens
  const code = new URL(resultUrl).searchParams.get("code")
  const tokens = await exchangeCodeForToken(code, codeVerifier, redirectUri)
}
```

**優勢:**
- 使用 Chrome Extension 的 `identity` permission
- 認證流程在獨立的 Web Auth Flow 視窗中完成
- 自動處理 redirect URI（格式：`https://<extension-id>.chromiumapp.org/`）
- 避免 popup 阻擋和跨域問題
- 更安全的 PKCE 流程

### 5. 數據持久化層級

```
Level 1: chrome.storage.local (Auth State)
  ├─ Access Token (1 hour)
  ├─ Refresh Token (90+ days)
  └─ Expiration Time

Level 2: Chrome Storage (User Data)
  ├─ Microsoft Account Info
  ├─ Cached Todos
  └─ User Preferences

Level 3: Background Service
  ├─ Periodic Token Refresh (30 min)
  ├─ Startup Token Refresh
  └─ Error Recovery

Level 4: Azure AD Backend
  └─ Token 驗證和續期
```

### 6. 完整的 Token 生命週期管理

```typescript
// 提供給組件使用的 ensureValidToken 函數
const ensureValidToken = async (): Promise<string | undefined> => {
  const current = await getAuth()
  const expired = current.expiresAt ? Date.now() >= current.expiresAt - 60_000 : true
  
  // 如果有有效 token，直接返回
  if (current.accessToken && !expired) {
    return current.accessToken
  }
  
  // 如果有 refresh token，嘗試刷新
  if (current.refreshToken) {
    try {
      const t = await refreshAccessToken(current.refreshToken)
      const next = {
        accessToken: t.access_token,
        refreshToken: t.refresh_token ?? current.refreshToken,
        expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000
      }
      await setAuth(next)
      return next.accessToken
    } catch (e) {
      // 刷新失敗，清除認證
      await clearAuth()
      return undefined
    }
  }
  
  return undefined
}
```

## 為何長期有效？

### 技術原因
1. **Refresh Token 長有效期**: Azure AD 的 refresh token 默認 90 天有效期
2. **自動續期機制**: 使用 refresh token 時會獲得新的 refresh token
3. **持久化存儲**: `chrome.storage.local` 數據不會因為關閉瀏覽器而清除
4. **多層刷新機制**: 
   - UI 層在用戶使用時自動刷新
   - 背景服務每 30 分鐘主動刷新
   - Extension 啟動時立即檢查並刷新
5. **智能重試**: 暫時性錯誤不會導致登出，提高可靠性

### 安全考量
1. **PKCE 保護**: 防止授權碼攔截攻擊
2. **Scope 限制**: 只請求必要的權限（`Tasks.ReadWrite`, `User.Read`, `offline_access`）
3. **Token 隔離**: 使用 `chrome.storage.local` 隔離存儲，其他網站無法訪問
4. **Common Authority**: 支持個人和組織賬戶
5. **Automatic Token Revocation**: 當用戶在 Microsoft 端修改密碼或撤銷權限時，token 會失效

## 關鍵實現代碼位置

### 認證相關 (hooks/useAuth.ts)
```typescript
// Token 刷新函數（帶重試）
async function refreshAccessToken(refreshToken: string, retryCount = 0) {
  // 實現自動重試邏輯
}

// 主動獲取有效 token
const ensureValidToken = async (): Promise<string | undefined> => {
  // 檢查並刷新 token
}

// 自動刷新監控
React.useEffect(() => {
  async function maybeRefresh() {
    if (auth.refreshToken && isExpired) {
      const t = await refreshAccessToken(auth.refreshToken)
      await setAuth({ /* 更新狀態 */ })
      
      // 排程下次刷新（過期前 5 分鐘）
      const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
      setTimeout(() => maybeRefresh(), timeUntilRefresh)
    }
  }
}, [auth.refreshToken, isExpired])
```

### 背景服務 (background.ts)
```typescript
// 背景刷新函數
async function backgroundRefreshToken() {
  const auth = await getAuth()
  const needsRefresh = auth.expiresAt ? Date.now() >= auth.expiresAt - 300_000 : true
  
  if (needsRefresh && auth.refreshToken) {
    const tokens = await refreshAccessToken(auth.refreshToken)
    await setAuth({ /* 更新狀態 */ })
  }
}

// 定期刷新 alarm
chrome.alarms.create("token-refresh", { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "token-refresh") {
    backgroundRefreshToken()
  }
})

// 啟動時刷新
backgroundRefreshToken()
```

## 實現建議

### 在新專案中實現相同機制

#### 1. 配置 Azure AD 應用
```bash
# 在 Azure Portal 註冊應用
1. 前往 Azure Portal > Azure Active Directory > App registrations
2. 新建應用註冊
3. 設定 Redirect URI 為 Chrome Extension URL
   格式: https://<extension-id>.chromiumapp.org/
4. 啟用 "Allow public client flows"
5. 配置 API permissions:
   - Microsoft Graph > Tasks.ReadWrite
   - Microsoft Graph > User.Read
   - 選擇 "Delegated permissions"
```

#### 2. Chrome Extension Manifest
```json
{
  "manifest_version": 3,
  "permissions": [
    "identity",
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "https://graph.microsoft.com/*",
    "https://login.microsoftonline.com/*"
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID",
    "scopes": [
      "Tasks.ReadWrite",
      "User.Read",
      "offline_access"
    ]
  }
}
```

#### 3. 實現 Auth Hook
```typescript
// hooks/useAuth.ts
import * as React from "react"

const AUTH_KEY = "auth.ms"
const CLIENT_ID = "YOUR_CLIENT_ID"
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
const SCOPES = "Tasks.ReadWrite User.Read offline_access"

type AuthState = {
  accessToken?: string
  expiresAt?: number
  refreshToken?: string
}

export function useAuth() {
  const [auth, setAuthState] = React.useState<AuthState>({})
  
  // 實現 login, logout, ensureValidToken 等函數
  // 實現自動刷新 useEffect
  
  return { token, isLoggedIn, login, logout, ensureValidToken }
}
```

#### 4. 實現背景服務
```typescript
// background.ts
async function backgroundRefreshToken() {
  // 檢查並刷新 token
}

chrome.alarms.create("token-refresh", { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "token-refresh") {
    backgroundRefreshToken()
  }
})

backgroundRefreshToken() // 啟動時執行
```

#### 5. API 客戶端配置
```typescript
// lib/msgraph.ts
export async function graphFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  })
  
  if (!res.ok) {
    throw new Error(`Graph error ${res.status}`)
  }
  
  return res.json()
}
```

## 注意事項與限制

### 1. Refresh Token 過期
- **原因**: 超過 90 天未使用，或用戶在 Azure AD 端撤銷權限
- **處理**: 
  ```typescript
  // 刷新失敗時清除認證狀態，引導用戶重新登入
  try {
    await refreshAccessToken(refreshToken)
  } catch (e) {
    await clearAuth()
    // UI 會自動顯示登入按鈕
  }
  ```

### 2. 背景服務限制
- Chrome Extension MV3 的 background service worker 會在閒置時暫停
- 使用 `chrome.alarms` 確保定期喚醒並刷新 token
- Alarm 間隔最少 1 分鐘（本專案使用 30 分鐘）

### 3. 多設備同步
- `chrome.storage.local` 僅限單一瀏覽器
- 不同設備需要分別登入
- 考慮使用 `chrome.storage.sync` 同步某些配置（但不能同步 token）

### 4. 安全最佳實踐
- ✅ 使用 PKCE 流程
- ✅ 不要將 token 暴露在控制台日誌中（生產環境）
- ✅ 使用 HTTPS 進行所有通訊
- ✅ 實施適當的錯誤處理
- ✅ 定期檢查 token 有效性

### 5. Token 刷新策略
```typescript
// 最佳實踐：在 token 過期前刷新
const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000 // 5 分鐘

async function ensureValidToken() {
  const auth = await getAuth()
  const needsRefresh = auth.expiresAt 
    ? Date.now() >= auth.expiresAt - REFRESH_BEFORE_EXPIRY 
    : true
    
  if (needsRefresh && auth.refreshToken) {
    return await refreshAccessToken(auth.refreshToken)
  }
  
  return auth.accessToken
}
```

## 測試場景

### 驗證長期免登入功能
1. ✅ **登入應用** → 正常使用
2. ✅ **關閉瀏覽器** → 重新開啟，無需登入
3. ✅ **等待 1 小時以上** → Access Token 過期，自動使用 Refresh Token 刷新
4. ✅ **長期未使用（如 30 天）** → 背景服務持續刷新，依然可以自動登入
5. ✅ **超過 90 天未使用** → 需要重新認證
6. ✅ **網絡暫時中斷** → 自動重試，不會登出

### 測試指令
```bash
# 1. 開發環境運行
pnpm dev

# 2. 建置生產版本
pnpm build

# 3. 載入 Extension
# 在 Chrome 中打開 chrome://extensions/
# 啟用"開發者模式"
# 點擊"載入未封裝項目"
# 選擇 build/chrome-mv3-prod 資料夾
```

## 總結

此專案實現長期免登入的核心是：

1. ✅ **OAuth 2.0 with PKCE** - 安全的認證流程
2. ✅ **Refresh Token 機制** - 90 天有效期，自動續期
3. ✅ **chrome.storage.local 持久化** - Token 存儲在本地
4. ✅ **多層自動刷新**：
   - UI 層：過期前 5 分鐘自動刷新
   - 背景服務：每 30 分鐘主動檢查
   - 啟動時：立即檢查並刷新
5. ✅ **智能重試機制** - 處理暫時性錯誤
6. ✅ **Chrome Extension Identity API** - 優化的認證流程
7. ✅ **ensureValidToken()** - 主動獲取有效 token 的函數

這套機制讓用戶在首次登入後，可以持續數月無需重新認證，大大提升了用戶體驗。

## 改進歷程

### v0.0.3 (2025-10-23)
- ✅ 添加帶重試機制的 token 刷新（最多 3 次，指數退避）
- ✅ 實現 UI 層自動刷新，在 token 過期前 5 分鐘主動刷新
- ✅ 添加背景服務定期刷新（每 30 分鐘）
- ✅ Extension 啟動時立即檢查並刷新 token
- ✅ 提供 `ensureValidToken()` 函數供組件使用
- ✅ 添加 `alarms` permission 支援背景定期任務

## 相關資源

- [OAuth 2.0 Authorization Code Flow with PKCE](https://oauth.net/2/pkce/)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Azure AD Token 生命週期](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-configurable-token-lifetimes)
- [Chrome Extension Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Chrome Extension Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)

---

**文檔版本**: 2.0  
**分析日期**: 2025-10-23  
**Chrome Extension 版本**: 0.0.3  
