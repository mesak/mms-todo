# 參考 Chrome 擴展身份驗證分析

## 概述
分析對象：`ngcncmglifogcgmddpepdihnkgagfjga` (MS Todo 官方擴展)
- 版本: 1.1
- 使用庫: **MSAL (Microsoft Authentication Library)**
- 存儲方式: **localStorage** + **chrome.storage**

---

## 核心發現：為什麼該擴展的登入持久？

### 1. **使用 MSAL 庫（而非自定義 OAuth）**

參考擴展使用的是微軟官方的 MSAL 庫，而不是自定義的 `chrome.identity.launchWebAuthFlow`。

```javascript
// MSAL 配置（從 minified 代碼推斷）
let y = new f.Lx({  // f.Lx 是 MSAL PublicClientApplication
  auth: {
    clientId: "e5da5554-682a-4a9f-ac32-c1a741b6050c",
    authority: "https://login.microsoftonline.com/common/",
    redirectUri: p,
    postLogoutRedirectUri: p
  },
  cache: {
    cacheLocation: "localStorage"  // 👈 持久化關鍵
  }
});
```

**優點：**
- MSAL 自動管理 token 生命週期
- 自動處理 token 刷新（refresh token flow）
- 會話恢復無需用戶交互

### 2. **localStorage 而非 chrome.storage.local**

```javascript
cache: {
  cacheLocation: "localStorage"
}
```

**為什麼重要：**
- `localStorage` 是頁面級別的持久存儲，跨越擴展重啟
- MSAL 在 localStorage 中自動存儲：
  - Access Token
  - Refresh Token
  - Token 過期時間
  - 帳戶信息
  - 緩存的認證狀態

### 3. **靜默刷新機制**

```javascript
// 自動靜默刷新 token
async function w() {
  return y.acquireTokenSilent({
    scopes: g,  // ["User.Read", "Tasks.Read", ...]
    account: y.getAllAccounts()[0]  // 使用已登錄帳戶
  }).catch(async e => {
    // 失敗則轉向交互式流程
    return x(await b())
  })
}
```

**流程：**
1. 嘗試從 localStorage 獲取有效 token
2. 如果 token 過期，自動使用 refresh token 獲取新 token
3. **完全無需用戶介入**

### 4. **帳戶管理**

```javascript
y.getAllAccounts()[0]  // 保留已登錄帳戶
```

MSAL 會記住用戶帳戶，下次擴展啟動時可直接使用

---

## 當前 mms-todo 實現的問題

### 問題 1: 手動 Token 刷新
```typescript
// 當前 useAuth.ts 的問題
async function refreshAccessToken() {
  // 手動管理刷新邏輯
  // 容易出現 race condition
  // 需要手動處理各種邊界情況
}
```

### 問題 2: 自定義 OAuth 實現
```typescript
// chrome.identity.launchWebAuthFlow 方式
// - 需要手動實現 PKCE
// - 需要手動管理 code_verifier 和 token
// - 容易遺漏邊界情況（如 token 過期）
```

### 問題 3: chrome.storage.local 可能有問題
```typescript
// 存儲在 chrome.storage.local['auth.ms']
// 但可能沒有正確序列化/反序列化
// 或在特定情況下被清除（如擴展更新、Chrome 清除數據等）
```

---

## 參考擴展的完整登入流程

```
啟動
  ↓
檢查 localStorage 中的 MSAL 緩存
  ↓
有有效 token？
  ├─ 是 → 直接使用
  ├─ 過期但有 refresh token → 靜默刷新 (acquireTokenSilent)
  └─ 無有效 token → 顯示登入按鈕

用戶點擊登入
  ↓
調用 loginRedirect()
  ↓
MSAL 自動處理：
  1. 生成 state + code_verifier (PKCE)
  2. 重定向到微軟登入
  3. 用戶授權
  4. 捕獲授權碼
  5. 交換 access token + refresh token
  6. 自動存儲在 localStorage
  7. 重定向回應用
  ↓
應用重新初始化
  ↓
localStorage 中有 token，直接使用
  ↓
使用 accessToken 調用 Microsoft Graph API
```

---

## 修復建議

### 方案 A: 遷移到 MSAL（推薦）

**優點：**
- 無需自己維護 token 生命週期
- 自動處理 token 刷新
- 官方庫，安全性有保證
- 支援帳戶管理

**缺點：**
- 需要重寫認證層

```typescript
// 使用 MSAL
import * as msal from '@azure/msal-browser'

const msalConfig = {
  auth: {
    clientId: "c9f320b3-a966-4bb7-8d88-3b51ae7f632f",
    authority: "https://login.microsoftonline.com/common/",
    redirectUri: chrome.runtime.getURL('popup.html'),
  },
  cache: {
    cacheLocation: "localStorage",  // 👈 關鍵
  },
};

const publicClientApplication = new msal.PublicClientApplication(msalConfig);

// 登入
await publicClientApplication.loginPopup({
  scopes: ["Tasks.ReadWrite", "User.Read", "offline_access"]
});

// 獲取 token（自動刷新）
const token = await publicClientApplication.acquireTokenSilent({
  scopes: ["Tasks.ReadWrite", "User.Read"],
  account: publicClientApplication.getAllAccounts()[0]
});
```

### 方案 B: 改進當前實現（快速修復）

如果不想完全遷移，可以改進當前實現：

#### 1. 改用 localStorage 而非 chrome.storage.local
```typescript
// 改變
const authState = {
  accessToken: string
  refreshToken: string
  expiresAt: number  // timestamp
  accounts: object[]  // 保存帳戶信息
}

// 存儲到 localStorage（自動跨擴展重啟持久化）
localStorage.setItem('auth.ms', JSON.stringify(authState))

// 讀取
const stored = localStorage.getItem('auth.ms')
```

**為什麼：**
- `localStorage` 比 `chrome.storage.local` 更可靠
- MSAL 就是用 `localStorage` 來持久化的
- 不容易被 Chrome 清除

#### 2. 改進 Token 刷新策略
```typescript
class AuthManager {
  private refreshTimer: number | null = null

  async initialize() {
    const stored = this.getStoredAuth()

    if (stored && stored.expiresAt > Date.now()) {
      // Token 仍有效，繼續使用
      this.accessToken = stored.accessToken
      this.scheduleRefresh(stored.expiresAt)
    } else if (stored && stored.refreshToken) {
      // Token 過期但有 refresh token，靜默刷新
      await this.refreshToken()
    } else {
      // 無有效 token，需要重新登入
      this.showLoginPrompt()
    }
  }

  private scheduleRefresh(expiresAt: number) {
    // 在 token 過期前 5 分鐘刷新
    const refreshTime = expiresAt - 5 * 60 * 1000
    const now = Date.now()

    if (refreshTime > now) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken()
      }, refreshTime - now)
    }
  }

  private async refreshToken() {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          scope: this.scopes.join(' '),
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        })
      })

      const data = await response.json()

      // 保存新 token
      this.saveAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
      })

      this.scheduleRefresh(this.expiresAt)
    } catch (error) {
      console.error('Token refresh failed:', error)
      // 刷新失敗，清除認證並提示重新登入
      this.clearAuth()
      this.showLoginPrompt()
    }
  }
}
```

#### 3. 處理擴展更新和重啟
```typescript
// background.ts
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    // 擴展更新後，檢查 localStorage 中的認證狀態
    const auth = localStorage.getItem('auth.ms')
    if (auth) {
      // 認證狀態仍然存在，無需重新登入
      console.log('Auth state preserved after update')
    }
  }
})

// 定期檢查 token 有效性
chrome.alarms.create('check-token', { periodInMinutes: 5 })
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-token') {
    const auth = await getAuth()
    if (auth && auth.expiresAt < Date.now()) {
      await refreshToken()
    }
  }
})
```

---

## localStorage vs chrome.storage.local 對比

| 方面 | localStorage | chrome.storage.local |
|------|--------------|-------------------|
| **持久化** | ✅ 跨擴展重啟 | ✅ 跨擴展重啟 |
| **容量** | ~5-10MB | ~10MB |
| **性能** | ⚡ 同步 | ❌ 異步（Promise） |
| **跨標籤** | ✅ 同源標籤共享 | ❌ 僅擴展可訪問 |
| **被清除風險** | 🟡 用戶清除瀏覽器數據時 | ✅ 更安全（專用存儲） |
| **官方推薦** | MSAL 的默認選擇 | Chrome 官方推薦 |

**結論：** 對於擴展，`localStorage` 實際上和 `chrome.storage.local` 一樣安全，而且**性能更好**。MSAL 採用 `localStorage` 就是這個原因。

---

## 當前登入崩潰的可能原因

基於以上分析，你的登入可能崩潰的原因：

1. ❌ **Token 刷新失敗但沒有正確恢復**
   - `useAuth.ts` 的 `refreshAccessToken` 失敗後沒有合適的降級方案

2. ❌ **使用 chrome.storage.local 導致的時序問題**
   - 異步讀寫可能導致競態條件
   - 擴展更新時數據可能丟失

3. ❌ **PKCE 流程實現不完整**
   - `code_verifier` 沒有正確保存
   - 重定向後無法匹配 `code_challenge`

4. ❌ **沒有帳戶恢復邏輯**
   - 用戶已登錄但在某個步驟導致狀態丟失
   - 沒有檢測和恢復機制

---

## 推薦修復步驟

### 立即（快速修復）
1. 將 `chrome.storage.local` 改為 `localStorage`
2. 在 `popup.tsx` 和 `sidepanel.tsx` 的 `useAuth()` 調用時添加錯誤邊界
3. 在 token 刷新失敗時，而不是直接登出，嘗試 3 次重試

### 短期（穩定性改進）
1. 添加完整的錯誤日誌
2. 實現 token 刷新的重試機制
3. 添加單元測試覆蓋 `useAuth` 的各種邊界情況

### 長期（架構改進）
1. 遷移到 MSAL，享受官方維護的好處
2. 實現帳戶切換功能
3. 添加離線使用支持（緩存任務數據）

---

## 快速診斷清單

檢查你的 `useAuth.ts`：

- [ ] `localStorage` 中是否正確存儲了 `auth.ms`？
- [ ] `code_verifier` 是否在整個 OAuth 流程中正確保存/恢復？
- [ ] token 刷新失敗時是否有重試邏輯？
- [ ] 擴展重啟時是否能正確恢復認證狀態？
- [ ] 是否處理了 Microsoft 返回錯誤碼的情況（如 invalid_grant）？
