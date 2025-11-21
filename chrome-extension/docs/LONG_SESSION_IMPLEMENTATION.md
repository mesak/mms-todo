# 長期會話實作指南

## 概述

本文檔說明如何在你的 Chrome Extension 專案中使用新實作的長期免登入機制。

## 主要改進

### 1. 多層 Token 刷新機制

#### UI 層自動刷新
- 在 `useAuth` hook 中自動監控 token 狀態
- Token 過期前 5 分鐘自動刷新
- 刷新成功後自動排程下次刷新

#### 背景服務定期刷新
- 使用 `chrome.alarms` API 每 30 分鐘檢查 token
- 即使用戶沒有打開擴展，也會在背景自動刷新
- Extension 啟動時立即檢查並刷新

### 2. 智能重試機制
- 網絡錯誤時自動重試（最多 3 次）
- 伺服器錯誤（5xx）或限流（429）時重試
- 使用指數退避策略（1s, 2s, 4s）

### 3. 主動 Token 獲取
- 提供 `ensureValidToken()` 函數
- 自動檢查並刷新過期的 token
- 適用於需要確保 token 有效的場景

## 使用方式

### 在組件中使用

```typescript
import { useAuth } from "~/hooks/useAuth"

function MyComponent() {
  const { token, isLoggedIn, login, logout, ensureValidToken } = useAuth()
  
  // 方式 1: 直接使用 token（自動處理刷新）
  useEffect(() => {
    if (token) {
      // 使用 token 調用 API
    }
  }, [token])
  
  // 方式 2: 主動確保 token 有效
  async function handleAction() {
    const validToken = await ensureValidToken()
    if (!validToken) {
      // Token 無效，需要重新登入
      return
    }
    // 使用 validToken 調用 API
  }
  
  // 登入狀態顯示
  if (!isLoggedIn) {
    return <button onClick={login}>登入</button>
  }
  
  return <div>已登入</div>
}
```

### 在 API 調用中使用

```typescript
import { graphFetch } from "~/lib/msgraph"
import { useAuth } from "~/hooks/useAuth"

function useTodos() {
  const { token, ensureValidToken } = useAuth()
  
  async function fetchTodos() {
    // 方式 1: 使用當前 token
    if (!token) return
    return graphFetch("/me/todo/lists", token)
    
    // 方式 2: 主動確保 token 有效
    const validToken = await ensureValidToken()
    if (!validToken) throw new Error("Not authenticated")
    return graphFetch("/me/todo/lists", validToken)
  }
  
  return { fetchTodos }
}
```

## 背景服務運作

背景服務會自動處理以下事項：

1. **Extension 啟動時**
   - 立即檢查存儲的 token
   - 如果 token 即將過期（5 分鐘內），立即刷新

2. **定期檢查（每 30 分鐘）**
   - 檢查 token 是否即將過期
   - 如果需要，自動刷新
   - 通知 UI 組件 token 已更新

3. **錯誤處理**
   - 網絡錯誤時自動重試
   - 如果 refresh token 失效，不會自動清除（等待用戶下次打開時處理）

## Token 生命週期

```
使用者首次登入
    ↓
獲取 Access Token (1小時) + Refresh Token (90天)
    ↓
存儲在 chrome.storage.local
    ↓
┌─────────────────────────────────────┐
│  UI 層監控                          │
│  - Token 過期前 5 分鐘刷新          │
│  - 自動排程下次刷新                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  背景服務監控                       │
│  - 每 30 分鐘檢查                   │
│  - Extension 啟動時檢查             │
└─────────────────────────────────────┘
    ↓
Token 保持有效（直到 Refresh Token 過期）
    ↓
90 天後或用戶撤銷權限
    ↓
需要重新登入
```

## 測試建議

### 1. 正常使用流程
```bash
1. 開發環境運行
   pnpm dev

2. 在 Chrome 中載入擴展
   chrome://extensions/ > 載入未封裝項目

3. 登入並使用

4. 關閉瀏覽器，重新開啟
   ✓ 應該自動保持登入狀態
```

### 2. Token 刷新測試
```typescript
// 在開發者工具的 Console 中執行

// 1. 查看當前 token 狀態
chrome.storage.local.get(['auth.ms'], (res) => {
  console.log('Auth state:', res['auth.ms'])
  const expiresIn = (res['auth.ms'].expiresAt - Date.now()) / 1000 / 60
  console.log(`Token expires in ${expiresIn.toFixed(2)} minutes`)
})

// 2. 手動觸發 token 刷新（在 background service worker console）
backgroundRefreshToken()

// 3. 查看 alarm 狀態
chrome.alarms.getAll((alarms) => {
  console.log('Active alarms:', alarms)
})
```

### 3. 錯誤處理測試
```typescript
// 1. 模擬網絡錯誤
// 在 DevTools > Network 中啟用 "Offline"

// 2. 嘗試刷新 token
// 應該看到重試邏輯運作

// 3. 恢復網絡
// Token 應該成功刷新
```

## 監控和除錯

### 查看背景服務日誌
1. 開啟 `chrome://extensions/`
2. 找到你的擴展
3. 點擊 "service worker" 連結
4. 在 Console 中查看日誌：
   - "Background token refresh initiated"
   - "Background token refresh successful"
   - "Token still valid, skipping background refresh"

### 查看 Token 狀態
```typescript
// 在任何 UI 組件的 Console 中
chrome.storage.local.get(['auth.ms'], (res) => {
  const auth = res['auth.ms']
  console.log('Access Token:', auth.accessToken ? '✓' : '✗')
  console.log('Refresh Token:', auth.refreshToken ? '✓' : '✗')
  console.log('Expires at:', new Date(auth.expiresAt))
  console.log('Time until expiry:', 
    ((auth.expiresAt - Date.now()) / 1000 / 60).toFixed(2), 'minutes')
})
```

## 常見問題

### Q: 為什麼我還是需要登入？
A: 可能的原因：
1. Refresh token 已過期（超過 90 天未使用）
2. 用戶在 Microsoft 端撤銷了權限
3. chrome.storage.local 被清除（例如清除瀏覽器數據）

### Q: Token 刷新失敗怎麼辦？
A: 系統會自動重試 3 次。如果仍然失敗：
1. 檢查網絡連接
2. 查看背景服務日誌
3. 如果是 refresh token 失效，需要重新登入

### Q: 可以調整刷新頻率嗎？
A: 可以，在 `background.ts` 中修改：
```typescript
// 改為每 15 分鐘檢查
chrome.alarms.create(TOKEN_REFRESH_ALARM, { periodInMinutes: 15 })
```

### Q: 如何強制重新登入？
A: 調用 `logout()` 函數：
```typescript
const { logout } = useAuth()
await logout()
// 用戶需要重新登入
```

## 最佳實踐

### 1. 在 API 調用前確保 Token 有效
```typescript
async function callApi() {
  const token = await ensureValidToken()
  if (!token) {
    // 引導用戶登入
    return
  }
  // 繼續調用 API
}
```

### 2. 處理 Token 刷新事件
```typescript
useEffect(() => {
  const listener = (message) => {
    if (message.action === "token_refreshed") {
      // Token 已刷新，可以重新載入數據
      refetchData()
    }
  }
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
}, [])
```

### 3. 在關鍵操作前檢查登入狀態
```typescript
async function createTodo(title: string) {
  if (!isLoggedIn) {
    // 引導用戶登入
    return
  }
  
  const token = await ensureValidToken()
  if (!token) {
    // Token 刷新失敗，需要重新登入
    return
  }
  
  // 繼續創建 todo
}
```

## 總結

通過這些改進，你的 Chrome Extension 現在可以：

✅ 長期保持登入狀態（最長 90 天）  
✅ 自動刷新 token，無需用戶干預  
✅ 處理暫時性網絡錯誤  
✅ 在背景持續維護登入狀態  
✅ 提供可靠的 token 獲取機制  

用戶體驗大幅提升！🎉
