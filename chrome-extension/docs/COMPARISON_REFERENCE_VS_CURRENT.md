# 參考擴展 vs 當前實現 對比

## 核心差異

| 方面 | 參考擴展（正常工作）| 當前 mms-todo（登入崩潰）|
|-----|-----------------|---------------------|
| **認證庫** | MSAL (官方) | 自定義 OAuth + chrome.identity |
| **存儲位置** | `localStorage` | `chrome.storage.local` |
| **初始化方式** | 同步讀取 | 異步讀取 (Promise) |
| **Token 刷新** | 自動（MSAL 內部） | 手動管理 |
| **失敗處理** | 自動重試 | 直接清除認證 |
| **跨 Context 同步** | MSAL 內部自動 | 依賴 storage.onChanged |
| **持久化計時** | 內部實現 | setTimeout（重啟丟失）|

---

## 詳細對比

### 1. 存儲機制

**參考擴展：**
```javascript
cache: {
  cacheLocation: "localStorage"  // 🎯 關鍵
}
```

**當前實現：**
```typescript
async function getAuth(): Promise<AuthState> {
    return new Promise((resolve) => {
        chrome.storage.local.get([AUTH_KEY], (res: any) => {  // ❌ 異步
            resolve((res[AUTH_KEY] as AuthState) ?? {})
        })
    })
}
```

**影響：**
| 問題 | localStorage | chrome.storage.local |
|------|-------------|-------------------|
| 初始化延遲 | ✅ 無（同步） | ❌ 有（異步）|
| 跨 Context 可見性 | ✅ 立即可見 | 🟡 有延遲 |
| 可靠性 | ✅ 很高 | 🟡 中等 |
| 性能 | ✅ 快（同步） | 🟡 慢（異步）|

---

### 2. Token 刷新機制

**參考擴展（MSAL）：**
```javascript
// 失敗時自動重試
let attempts = 0
while (attempts < maxRetries) {
    try {
        const result = await acquireTokenSilent()
        return result
    } catch (e) {
        // 智能決策：是否重試？
        if (isTransientError(e)) {
            attempts++
            await sleep(exponentialBackoff(attempts))
            continue
        } else {
            throw e  // 真正的錯誤，不重試
        }
    }
}
```

**當前實現：**
```typescript
try {
    const t = await refreshAccessToken(current.refreshToken)
    // ... 更新 Token
} catch (e) {
    console.error("Failed to refresh token:", e)
    await clearAuth()  // ❌ 立即清除！任何錯誤都導致退出
    return undefined
}
```

**影響場景：**

| 場景 | 參考擴展 | 當前實現 |
|------|---------|---------|
| 短暫網路中斷 | ✅ 自動恢復 | ❌ 立即要求重新登入 |
| 伺服器 500 | ✅ 重試（延遲遞增） | ❌ 立即要求重新登入 |
| Token 真的過期 | ✅ 提示重新登入 | ✅ 提示重新登入 |
| Rate Limit (429) | ✅ 重試 | ❌ 立即要求重新登入 |

---

### 3. 初始化流程

**參考擴展：**
```javascript
// 應用啟動時
const accounts = msal.getAllAccounts()
if (accounts.length > 0) {
    // ✅ 立即可用已登錄帳戶
    const accessToken = await msal.acquireTokenSilent({
        account: accounts[0],
        scopes: scopes
    })
    showMainUI()
}
```

**當前實現：**
```typescript
React.useEffect(() => {
    let mounted = true
    setPhase("initializing")

    getAuth().then((a) => {  // ⏳ 等待異步讀取
        if (!mounted) return
        setAuthState(a)
        setIsLoading(false)
        // ... 判定階段
    })
}, [])

// 在此期間 UI 一直是 loading 狀態
return <AuthGate>{isLoading ? <Spinner /> : <App />}</AuthGate>
```

**結果：**
- 參考擴展：啟動 → 立即顯示主界面（同步讀取）
- 當前實現：啟動 → 加載轉圈 → 顯示主界面（異步延遲）

---

### 4. 多 Context 同步

**參考擴展：**
```javascript
// MSAL 自動在 localStorage 中存儲
// 所有 tab/context 自動看到最新值
const token = await msal.acquireTokenSilent()  // 自動從 localStorage 獲取
```

**當前實現：**
```typescript
// Popup 讀取 chrome.storage.local
// SidePanel 讀取 chrome.storage.local
// Background 讀取 chrome.storage.local
// 但因為異步，可能出現不同步

const listener = (changes, area) => {
    if (area !== "local") return
    if (Object.prototype.hasOwnProperty.call(changes, AUTH_KEY)) {
        // 依賴 onChanged 事件同步
        // 🟡 可能有時序問題
        setAuthState(v?.newValue)
    }
}
chrome.storage.onChanged.addListener(listener)
```

---

### 5. 持久化計時

**參考擴展：**
```javascript
// MSAL 內部使用瀏覽器 IndexedDB 和時間戳
// 即使重啟也能精確計算 token 剩餘時間
const expiresAt = msal.getAccountFromCache().expiresAt
const timeRemaining = expiresAt - Date.now()
if (timeRemaining < 300000) {  // 5 分鐘內過期
    await refresh()
}
```

**當前實現：**
```typescript
const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
refreshTimer = setTimeout(() => {  // ❌ 重啟丟失計時器
    if (!cancelled) maybeRefresh()
}, timeUntilRefresh)
```

**問題場景：**
1. Token 將在 1 小時後過期
2. 設置 `setTimeout` 55 分鐘後刷新
3. **用戶關閉瀏覽器**
4. 用戶 30 分鐘後打開瀏覽器
5. ❌ 計時器丟失，Token 在使用時才發現已過期

---

## 為什麼參考擴展更穩定？

### 1. **使用官方 MSAL 庫**
- 微軟官方維護，考慮了所有邊界情況
- 已在數百萬用戶的生產環境中驗證

### 2. **localStorage 作為主要存儲**
- 與 IndexedDB 同步（自動持久化）
- 同步讀寫，無競態條件
- MSAL 設計就是基於 localStorage

### 3. **智能錯誤分類**
- 區分 transient 錯誤 vs 永久性錯誤
- Transient 錯誤自動重試
- 永久性錯誤才要求重新登入

### 4. **自動 Token 刷新**
- MSAL 自動管理
- 無需手動計時
- 無遺漏邊界情況

---

## 快速修復優先級

### 🔴 立即修復（導致當前崩潰）
1. **改用 localStorage** - 解決同步初始化問題
2. **改進錯誤恢復** - 不要每次都清除認證

### 🟡 短期改進（提高可靠性）
3. **添加重試邏輯** - transient 錯誤自動重試
4. **使用 chrome.alarms** - 持久化計時器

### 🟢 長期改進（架構優化）
5. **遷移到 MSAL** - 享受官方庫的優勢

---

## 實施步驟

### 第一步：換用 localStorage（15 分鐘）
```typescript
// 用同步 localStorage 替換非同步 chrome.storage.local
function getAuthSync(): AuthState {
    const stored = localStorage.getItem(AUTH_KEY)
    return stored ? JSON.parse(stored) : {}
}
```

**測試：**
```bash
# 登入 → 關閉擴展 → 打開擴展
# 應該立即恢復登入狀態（無加載轉圈）
```

### 第二步：改進錯誤恢復（30 分鐘）
```typescript
// 區分 invalid_grant 和其他錯誤
if (error.includes("invalid_grant")) {
    clearAuthSync()  // Token 真的無效了
} else {
    // Transient 錯誤，30 秒後重試
    setTimeout(maybeRefresh, 30000)
}
```

**測試：**
```bash
# 關閉網路 → 等 30 秒 → 恢復網路
# 應該自動重試而不是退出登入
```

### 第三步：添加 chrome.alarms（45 分鐘）
```typescript
// 使用持久化計時器
chrome.alarms.create("token-refresh", {
    delayInMinutes: Math.ceil(timeUntilRefresh / 60000)
})

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "token-refresh") {
        maybeRefresh()
    }
})
```

---

## 驗證檢查清單

完成修改後，確認：

- [ ] **同步初始化：** 啟動擴展時無 loading 轉圈
- [ ] **狀態恢復：** 關閉/打開擴展，Token 自動恢復
- [ ] **網路恢復：** 斷網 → 恢復 → 自動重試
- [ ] **Token 刷新：** 自動在過期前 5 分鐘刷新
- [ ] **多 Context 同步：** popup + sidepanel 狀態一致
- [ ] **優雅降級：** Token 真的無效時才提示重新登入

---

## 相關文件

- `AUTH_FIX_GUIDE.md` - 詳細修復實現
- `ANALYSIS_REFERENCE_AUTH.md` - 參考擴展分析
- `hooks/useAuth.ts` - 當前實現（待修改）
