# 登入邏輯安全性檢查報告

## 執行摘要

經過仔細檢查 Chrome Extension 的認證系統，我發現了 **3 個重要問題**需要修復：

> [!WARNING]
> 發現嚴重的跨環境資料不一致問題，可能導致登入狀態混亂和安全性風險。

---

## 🔍 檢查項目

### ✅ 1. 登入邏輯是否有效

**狀態**: 基本有效，但有改進空間

#### 現有實作
- ✅ 使用 OAuth 2.0 PKCE flow
- ✅ Token 和 Refresh Token 正確儲存
- ✅ 自動 Token 刷新機制（帶重試邏輯）
- ✅ 錯誤處理區分 transient 錯誤和真正無效的 Token

#### 優點
```typescript
// useAuth.ts Line 194-247: 智能的 Token 刷新策略
async function refreshAccessToken(refreshToken: string, retryCount = 0) {
    // ✅ 區分暫時性錯誤和永久性錯誤
    const isTransient = res.status >= 500 || res.status === 429
    const isInvalidGrant = text.includes("invalid_grant")
    
    // ✅ 指數退避重試（最多 3 次）
    if (retryCount < 3 && (isTransient || isNetworkError)) {
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return refreshAccessToken(refreshToken, retryCount + 1)
    }
}
```

---

### ⚠️ 2. 是否可以保留長時間登入狀態

**狀態**: **部分有效，但發現重大問題**

#### 問題 1: 雙重儲存系統造成不一致 🔴

專案中同時使用了 **localStorage** 和 **chrome.storage.local**，導致資料不同步：

| 位置 | 使用的儲存 | 問題 |
|------|----------|------|
| [`useAuth.ts`](file:///home/mesak/plugins/chrome/mms-todo/chrome-extension/hooks/useAuth.ts#L17-L33) | localStorage | ✅ 同步、快速 |
| [`background.ts`](file:///home/mesak/plugins/chrome/mms-todo/chrome-extension/background.ts#L21-L33) | chrome.storage.local | ⚠️ 異步、可能不同步 |

**風險**：
- background.ts 的 Token 刷新可能使用過期的 Token
- 擴展啟動時，background.ts 讀取的認證狀態與 UI 不一致
- Token 刷新成功後，chrome.storage.local 中的資料未被更新

**證據**：
```typescript
// background.ts Line 29-33
async function setAuth(state: AuthState): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AUTH_KEY]: state }, () => resolve())
  })
}
// ❌ 但 useAuth.ts 使用的是 localStorage.setItem(AUTH_KEY, ...)
```

#### 問題 2: background.ts 的 Token 刷新可能失敗 🔴

[background.ts](file:///home/mesak/plugins/chrome/mms-todo/chrome-extension/background.ts#L63-L93) 在啟動和每 30 分鐘會嘗試刷新 Token，但：

```typescript
// background.ts Line 65-76
const auth = await getAuth()  // ❌ 從 chrome.storage.local 讀取
if (!auth.refreshToken) {
  console.log("No refresh token available for background refresh")
  return
}
```

如果 useAuth.ts 更新了 localStorage 但沒有同步到 chrome.storage.local，background.ts 會讀不到 refreshToken。

---

### ❌ 3. 登出是否能正確清理前一個登入資訊

**狀態**: **基本正確，但有殘留問題**

#### 已實作的清除邏輯

[useAuth.ts logout()](file:///home/mesak/plugins/chrome/mms-todo/chrome-extension/hooks/useAuth.ts#L356-L397) 清除：
- ✅ localStorage: `auth.ms`, `login_state`, `ms_account`, `rq-mms-todo`
- ✅ React 狀態
- ✅ 發送消息給 background.ts

[background.ts](file:///home/mesak/plugins/chrome/mms-todo/chrome-extension/background.ts#L175-L188) 清除：
- ✅ chrome.storage.local: `auth.ms`, `ms_account`, `todos`, `categories`
- ✅ chrome.alarms

#### 問題 3: chrome.storage.local 可能殘留 Token 🟡

登出流程：
```typescript
// useAuth.ts Line 361-366
clearAuthSync()  // ✅ 清除 localStorage
localStorage.removeItem("login_state")
localStorage.removeItem("ms_account")
localStorage.removeItem("rq-mms-todo")

// ❌ 但沒有清除 chrome.storage.local！
```

background.ts 會清除 chrome.storage.local，但如果訊息傳遞失敗（例如 background service worker 未啟動），chrome.storage.local 中的 Token 會殘留。

---

## 🛠️ 建議修復方案

### 修復 1: 統一儲存策略（優先順序：高）

**方案 A（推薦）**: 完全移除 chrome.storage.local，統一使用 localStorage

修改 [background.ts](file:///home/mesak/plugins/chrome/mms-todo/chrome-extension/background.ts):

```typescript
// 改為使用 localStorage（與 useAuth.ts 一致）
const AUTH_KEY = "auth.ms"

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
```

**方案 B**: 雙向同步 localStorage ↔ chrome.storage.local

如果需要保留 chrome.storage.local（例如為了 background service worker 的持久性），則需要：

1. useAuth.ts 每次更新 localStorage 時也更新 chrome.storage.local
2. background.ts 每次更新 chrome.storage.local 時也更新 localStorage
3. 監聽兩者的變化並同步

---

### 修復 2: 登出時確保完全清除（優先順序：中）

在 useAuth.ts 的 logout() 中增加直接清除 chrome.storage.local：

```typescript
// useAuth.ts logout() 函數
const logout = React.useCallback(async () => {
  console.log("[useAuth] Logout started")
  
  // 1. 清除 localStorage
  clearAuthSync()
  localStorage.removeItem("login_state")
  localStorage.removeItem("ms_account")
  localStorage.removeItem("rq-mms-todo")
  
  // 2. 直接清除 chrome.storage.local（不依賴訊息傳遞）
  try {
    await new Promise<void>((resolve) => {
      chrome.storage.local.remove(["auth.ms", "ms_account", "todos", "categories"], () => {
        console.log("[useAuth] Cleared chrome.storage.local")
        resolve()
      })
    })
  } catch (e) {
    console.error("[useAuth] Failed to clear chrome.storage.local:", e)
  }
  
  // 3. 清除本地 React 狀態
  setAuthState({})
  setPhase("prompt")
  setFlowStep(undefined)
  
  // 4. 通知 background.ts（額外保險）
  try {
    await chrome.runtime.sendMessage({ action: "logout_initiated" })
  } catch { }
  
  // 5-6. 其餘通知邏輯...
}, [])
```

---

### 修復 3: 增強 Token 過期檢測（優先順序：低）

增加 Token 有效性的持續監控：

```typescript
// useAuth.ts 中增加定期檢查
React.useEffect(() => {
  const interval = setInterval(() => {
    const current = getAuthSync()
    const expired = current.expiresAt ? Date.now() >= current.expiresAt - 30_000 : true
    
    if (expired && !current.refreshToken) {
      // Token 已過期且無 refresh token，強制登出
      console.warn("[useAuth] Token expired, forcing logout")
      setAuthState({})
      setPhase("prompt")
    }
  }, 60000)  // 每分鐘檢查一次
  
  return () => clearInterval(interval)
}, [])
```

---

## 📊 風險評估

| 問題 | 嚴重性 | 發生機率 | 影響 |
|------|--------|---------|------|
| 雙重儲存不一致 | 🔴 高 | 中 | 登入狀態可能突然失效 |
| chrome.storage.local 殘留 Token | 🟡 中 | 低 | 切換帳號時可能看到舊資料 |
| background.ts Token 刷新失敗 | 🟡 中 | 中 | 長時間使用後可能需要重新登入 |

---

## ✅ 測試建議

完成修復後，請執行以下測試：

1. **長時間登入測試**
   - 登入後關閉所有擴展視窗
   - 等待 24 小時
   - 重新打開，應自動恢復登入狀態

2. **跨環境同步測試**
   - 同時打開 Popup 和 SidePanel
   - 在 Popup 中登出
   - SidePanel 應立即顯示登出狀態

3. **帳號切換測試**
   - 以帳號 A 登入，瀏覽任務
   - 登出
   - 以帳號 B 登入
   - 應看到帳號 B 的任務（無混雜）

4. **儲存一致性測試**
   ```javascript
   // 在 DevTools Console 執行
   console.log("localStorage:", localStorage.getItem("auth.ms"))
   chrome.storage.local.get(["auth.ms"], (res) => {
     console.log("chrome.storage.local:", res["auth.ms"])
     // 應該完全一致
   })
   ```

---

## 📝 總結

總體來說，登入邏輯的核心實作**基本正確且安全**，但因為儲存策略不一致導致以下問題：

- ⚠️ 不同 context 可能讀取到不同的認證狀態
- ⚠️ 長時間登入可能失效
- ⚠️ 登出可能不完整

**建議優先實施「修復 1: 統一儲存策略」**，這將解決所有問題的根本原因。
