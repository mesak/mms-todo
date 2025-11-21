# 登出和帳號切換修復指南

## 問題確認

修復前的問題：
1. ❌ 登出按鈕可能無法工作
2. ❌ 切換帳號登入會顯示上一個人的 TOKEN 和任務
3. ❌ 缺少完整的跨 Context 同步

## 修復內容

### 修復 1: useAuth.ts - 完整的登出流程（改進 7）

**清除的內容：**
```typescript
// 1. localStorage 中的所有認證相關數據
clearAuthSync()                              // 清除 auth.ms
localStorage.removeItem("login_state")       // 清除登入狀態
localStorage.removeItem("ms_account")        // 清除用戶信息

// 2. React Query 緩存（rq-mms-todo）
localStorage.removeItem("rq-mms-todo")

// 3. 本地 React 狀態
setAuthState({})
setPhase("prompt")
setFlowStep(undefined)

// 4. 通知 background.ts
chrome.runtime.sendMessage({
    action: "logout_initiated"
})

// 5. 發送 account_changed 消息清除所有 Context 的緩存
chrome.runtime.sendMessage({
    action: "account_changed",
    account: null  // null 表示已登出
})

// 6. 通知其他 Context
chrome.runtime.sendMessage({
    action: "logout_completed"
})
```

### 修復 2: background.ts - 後端登出處理（改進 8）

**處理 logout_initiated 消息：**
```typescript
if (action === "logout_initiated") {
    // 1. 清除 chrome.storage.local 中的數據
    chrome.storage.local.remove(["auth.ms", "ms_account", "todos", "categories"])

    // 2. 清除計劃的 token 刷新
    chrome.alarms.clear(TOKEN_REFRESH_ALARM)
}
```

### 修復 3: providers.tsx - React Query 緩存清除（改進 9）

**增強的 account_changed 處理：**
```typescript
// account_changed 可能是：
// 1. 帳號切換（account = { id, upn, displayName }）
// 2. 登出（account = null）
if (msg?.action === "account_changed") {
    globalClient.clear()  // 完全清除所有 React Query 緩存
}

// 額外的登出確認消息
if (msg?.action === "logout_completed") {
    globalClient.clear()  // 再次確保
}
```

---

## 修復流程圖

```
用戶點擊「登出」
    ↓
[useAuth.ts - logout()]
├─ 清除 localStorage (auth.ms, ms_account, login_state)
├─ 清除 React Query 緩存 (rq-mms-todo)
├─ 清除本地狀態 (authState, phase, flowStep)
├─ 發送「logout_initiated」給 background.ts
├─ 發送「account_changed」給所有 Context
└─ 發送「logout_completed」給所有 Context
    ↓
[background.ts]
├─ 收到「logout_initiated」
├─ 清除 chrome.storage.local (auth.ms, ms_account)
└─ 清除計劃的 token 刷新 (chrome.alarms)
    ↓
[providers.tsx]
├─ 收到「account_changed」→ globalClient.clear()
└─ 收到「logout_completed」→ globalClient.clear()
    ↓
所有狀態和緩存完全清除 ✅
顯示「請登入」提示 ✅
```

---

## 切換帳號流程

```
用戶登出 → 點擊「登入」 → 使用不同帳號認證
    ↓
[useAuth.ts - login()]
├─ 獲取新帳號的 token
└─ 發送「login_completed_with_token」給 background.ts
    ↓
[background.ts]
├─ 調用 fetchMe() 獲取新用戶信息
├─ 比較舊帳號 ID（prev.id）和新帳號 ID（newAccount.id）
├─ 如果不同：changed = true
├─ 儲存新帳號到 ms_account
└─ 發送「account_changed」給所有 Context
    ↓
[providers.tsx]
├─ 收到「account_changed」→ globalClient.clear()
└─ 清除所有舊用戶的任務列表、附件等緩存
    ↓
新用戶的數據立即顯示（無舊數據混雜）✅
```

---

## 測試檢查清單

### ✅ 測試 1: 登出按鈕工作（5 分鐘）

**步驟：**
1. 已登入狀態
2. 點擊 Popup 中的用戶圖標（右上角）
3. 選擇「Sign Out」或「登出」
4. 等待 1-2 秒

**預期結果：**
- ✅ 按鈕點擊有反應（不會卡住）
- ✅ 頁面返回「Sign In」提示
- ✅ Popup 和 SidePanel 都顯示登出狀態
- ✅ 任務列表消失

**控制台日誌：**
```
Logout completed: all state cleared
React Query cache cleared due to account change: null
Background: cleared auth and user data from chrome.storage.local
Background: cleared token refresh alarm
```

### ✅ 測試 2: 帳號切換（10 分鐘）

**準備：**
- 有 2 個不同的 Microsoft 帳號

**步驟：**
1. 用帳號 A 登入
2. 確認看到帳號 A 的任務
3. 點擊登出
4. 點擊登入，使用帳號 B 認證
5. 等待加載完成

**預期結果：**
- ✅ 帳號 B 的用戶名顯示
- ✅ **看到帳號 B 的任務**（非帳號 A 的）
- ✅ 無快取混雜
- ✅ Popup 和 SidePanel 顯示相同的任務

**控制台日誌：**
```
Background: cleared auth and user data from chrome.storage.local
React Query cache cleared due to account change: {id: "...", upn: "user_b@...", displayName: "User B"}
Background: cleared token refresh alarm
```

### ✅ 測試 3: 多 Context 登出同步（5 分鐘）

**步驟：**
1. 在 Popup 和 SidePanel 中都打開已登入狀態
2. 在 Popup 中點擊登出
3. 檢查 SidePanel

**預期結果：**
- ✅ Popup 立即變為「Sign In」
- ✅ SidePanel 也立即變為「Sign In」
- ✅ 無需手動刷新

**如果失敗：**
- 手動刷新 SidePanel（F5）
- 檢查 Console 是否有消息傳遞錯誤

### ✅ 測試 4: 登入後無舊數據（10 分鐘）

**場景：**
- 先以帳號 A 登入，瀏覽任務
- 登出
- 立即以帳號 A 重新登入

**預期結果：**
- ✅ 看到帳號 A 的任務（不是舊快取）
- ✅ 任務列表內容正確
- ✅ 不會看到重複的任務

**如果失敗：**
- 可能 React Query 快取沒有完全清除
- 檢查 Console 日誌中是否有「cache cleared」的消息

### ✅ 測試 5: Console 診斷（5 分鐘）

**步驟：**
1. 已登入狀態，打開 DevTools
2. 執行 DIAGNOSTIC_SCRIPT.js
3. 點擊登出
4. 再次執行 DIAGNOSTIC_SCRIPT.js

**預期結果：**

登入時：
```
✅ localStorage 中找到 auth.ms
✅ 找到 refresh token
✅ 已登入，Token 有效
```

登出後：
```
❌ localStorage 中未找到 auth.ms（已清除）
❌ 缺少 refresh token（已清除）
❌ 未登入
✅ 無進行中的操作
```

---

## 常見問題診斷

### 問題 1: 登出按鈕點擊無反應

**可能原因：**
- useAuth 中的 logout 函數未被正確調用
- Chrome 消息傳遞失敗
- 防抖延遲（debounce）設置過長

**診斷步驟：**
1. 打開 DevTools Console
2. 執行：`console.log('Auth hooks:', window.__AUTH__)`
3. 點擊登出按鈕
4. 查看 Console 是否有「Logout completed」日誌

**修復：**
- 如果看不到日誌，可能是 logout 函數未執行
- 檢查 popup.tsx 第 98 行的 onLogout 是否正確調用

### 問題 2: 登出後仍顯示舊帳號的數據

**可能原因：**
- React Query 緩存未被清除（rq-mms-todo 未刪除）
- providers.tsx 沒有收到「account_changed」消息
- localStorage 清除失敗

**診斷步驟：**
1. 打開 DevTools
2. 檢查 Application → Local Storage：
   - ❌ `rq-mms-todo` 應該被刪除
   - ❌ `auth.ms` 應該被刪除
   - ❌ `ms_account` 應該被刪除
3. 手動清除：
   ```javascript
   localStorage.removeItem('rq-mms-todo')
   localStorage.removeItem('auth.ms')
   localStorage.removeItem('ms_account')
   location.reload()
   ```

**修復：**
- 確保 logout 函數執行了所有 removeItem 操作
- 檢查 Console 中是否有「React Query cache cleared」的日誌

### 問題 3: 切換帳號後看不到新帳號的任務

**可能原因：**
- 新帳號的任務加載延遲
- React Query 緩存未被正確清除
- 舊 token 仍在被使用

**診斷步驟：**
1. 登出並使用新帳號登入
2. 等待 3-5 秒讓任務加載
3. 檢查 Network 標籤：
   - ✅ 應該看到 `/me` 和 `/me/todo/lists` 請求
   - ✅ Bearer token 應該是新用戶的

**修復：**
- 手動重新整理擴展（禁用/啟用）
- 檢查 token 是否正確更新

### 問題 4: 登出後仍有計劃的 token 刷新

**症狀：**
- 登出後，background.ts 仍在嘗試刷新 token

**原因：**
- `chrome.alarms.clear()` 失敗或沒有執行

**修復：**
- 檢查 Console 是否有「cleared token refresh alarm」
- 手動執行：`chrome.alarms.clearAll()`

---

## 驗證修復成功的標誌

修復完全成功應表現為：

1. ✅ **登出工作正常**
   - 按鈕點擊有反應
   - 立即返回登入提示
   - 無錯誤

2. ✅ **帳號切換無快取污染**
   - 切換帳號看到正確的任務
   - 無舊帳號的數據混雜
   - 多 Context 同步

3. ✅ **所有狀態完全清除**
   - localStorage 中無認證數據
   - React Query 快取清空
   - background.ts 無計劃任務

4. ✅ **Console 日誌清晰**
   - 登出時：「Logout completed: all state cleared」
   - 帳號變更：「React Query cache cleared due to account change」
   - background：「cleared auth and user data」

---

## 實施要點

| 項目 | 檔案 | 改進 |
|------|------|------|
| **useAuth.ts** | 改進 7 | 完整登出流程，清除所有狀態 |
| **background.ts** | 改進 8 | 處理 logout_initiated，清除後端狀態 |
| **providers.tsx** | 改進 9 | 增強 account_changed 處理 |

---

## 下一步

1. ✅ 構建已完成
2. 🔄 **測試修復**（使用上述檢查清單）
3. 📝 **記錄結果**
4. 📦 **提交代碼**（可選）

---

## 回滾

如果需要恢復到未修復版本：

```bash
# 恢復 useAuth.ts
git checkout HEAD -- hooks/useAuth.ts

# 恢復 background.ts
git checkout HEAD -- background.ts

# 恢復 providers.tsx
git checkout HEAD -- providers.tsx

# 重新構建
pnpm build
```
