# 🧪 完整測試計劃 - 所有 10 項改進驗證

## 📋 已完成的改進概述

| 改進 | 檔案 | 功能 | 狀態 |
|------|------|------|------|
| 1-6 | hooks/useAuth.ts | 登入持久化和跨 Context 同步 | ✅ 完成 |
| 7 | hooks/useAuth.ts | 完整登出流程 | ✅ 完成 |
| 8 | background.ts | 後端登出處理 | ✅ 完成 |
| 9 | providers.tsx | React Query 緩存清除 | ✅ 完成 |
| 10 | hooks/useAuth.ts | 重登時的跨 Context 同步 | ✅ 完成 |

---

## 🚀 開始測試前的準備

### 1. 啟動開發伺服器
```bash
pnpm dev
```

### 2. 在 Chrome 中重新載入擴展
1. 打開 `chrome://extensions/`
2. 禁用擴展後重新啟用，或點擊「刷新」
3. 打開 DevTools（F12）並切換到「Console」標籤

### 3. 驗證構建成功
```bash
pnpm build
```
✅ 應顯示 `DONE | Finished in ...`

---

## 📝 5 大測試類別 × 3 個場景 = 15 個測試點

### 🔐 第 1 類：初始登入（Improvements 1-6）

#### 測試 1.1: 同步初始化
**操作：** 打開 Popup
**預期：**
- ✅ Popup 立即顯示（無等待）
- ✅ Console: 無 "initializing..." 日誌
- ✅ 如已登入：立即顯示任務列表

**驗證：**
```javascript
// 在 DevTools Console 執行
localStorage.getItem('auth.ms')  // 應該有值（如已登入）
```

---

#### 測試 1.2: localStorage 同步存儲
**操作：** 登入
**預期：**
- ✅ localStorage 中立即出現 auth.ms（無延遲）
- ✅ 不經過 chrome.storage.local（改進 1）

**驗證：**
```javascript
// 登入後，在 Console 執行
localStorage.getItem('auth.ms')     // 應有 accessToken, refreshToken, expiresAt
JSON.parse(localStorage.getItem('auth.ms'))
```

**拒絕：** ❌ chrome.storage.local 中不應有 auth.ms（舊方法）

---

#### 測試 1.3: 跨 Context 立即同步（StorageEvent）
**操作：**
1. 打開 Popup，確認已登入
2. 同時打開 SidePanel
3. 觀察 SidePanel 的加載狀態

**預期：**
- ✅ SidePanel 立即顯示任務列表（<500ms）
- ✅ 無需手動刷新

**失敗排查：**
- 檢查 Console 中是否有 StorageEvent 日誌
- 驗證 localStorage auth.ms 是否被正確讀取

---

### 🔄 第 2 類：Token 刷新和重試（Improvements 3, 5）

#### 測試 2.1: Token 有效期檢查
**操作：** 登入，等待 30 秒
**預期：**
- ✅ Popup 仍顯示任務列表
- ✅ Token 自動刷新（不中斷用戶操作）

**驗證：**
```javascript
// 登入後執行
const auth = JSON.parse(localStorage.getItem('auth.ms'))
const isExpired = Date.now() >= auth.expiresAt - 30000
console.log('Token expired:', isExpired)  // 應為 false
```

---

#### 測試 2.2: 暫時性錯誤的重試邏輯（Improvements 3, 6）
**操作：**
1. 打開 DevTools Network 標籤
2. 模擬網路延遲或 500 錯誤
3. 執行 ensureValidToken()

**預期：**
- ✅ 自動重試 3 次（指數退避）
- ✅ 最終成功或明確失敗（不卡住）

**Console 日誌應包含：**
```
Token refresh failed with 500, retrying in 1000ms... (attempt 1/3)
Token refresh failed with 500, retrying in 2000ms... (attempt 2/3)
Token refresh failed with 500, retrying in 4000ms... (attempt 3/3)
```

---

#### 測試 2.3: 永久性錯誤不重試（改進 3）
**操作：**
1. 故意使用過期的 refresh token
2. 觀察 Token 刷新行為

**預期：**
- ✅ 檢測到 `invalid_grant` 錯誤
- ✅ 立即失敗，不重試（節省時間）
- ✅ 返回登入提示

**Console 日誌應包含：**
```
Token is invalid (possibly expired): ...
```

---

### 🔓 第 3 類：登出和狀態清除（Improvements 7-9）

#### 測試 3.1: 完整登出流程
**操作：**
1. 已登入狀態
2. 點擊用戶頭像 → 「登出」

**預期：**
- ✅ 按鈕立即反應（無卡頓）
- ✅ 頁面立即返回「Sign In」提示
- ✅ Popup 和 SidePanel 都更新

**驗證（登出後執行）：**
```javascript
console.log('auth.ms:', localStorage.getItem('auth.ms'))          // null
console.log('login_state:', localStorage.getItem('login_state'))  // null
console.log('ms_account:', localStorage.getItem('ms_account'))    // null
console.log('rq-mms-todo:', localStorage.getItem('rq-mms-todo'))  // null
```

**Console 日誌應包含：**
```
Logout completed: all state cleared
React Query cache cleared due to account change: null
Background: cleared auth and user data from chrome.storage.local
Background: cleared token refresh alarm
```

---

#### 測試 3.2: 多 Context 登出同步
**操作：**
1. Popup 和 SidePanel 都顯示已登入
2. 在 Popup 中點擊登出
3. 立即查看 SidePanel

**預期：**
- ✅ SidePanel 立即顯示「Sign In」提示（無需刷新）
- ✅ 兩個 Context 同步時間 <100ms

---

#### 測試 3.3: 登出後 Token 刷新停止
**操作：**
1. 登入（啟動 token 刷新鬧鐘）
2. 登出
3. 打開 DevTools → Application → Service Workers

**預期：**
- ✅ chrome.alarms 中無 "token-refresh" 鬧鐘
- ✅ Background 不會嘗試刷新 token

**驗證：**
```javascript
// Background service worker Console
chrome.alarms.getAll((alarms) => console.log(alarms))  // 應為空陣列
```

---

### 👥 第 4 類：帳號切換和快取清除（Improvements 7-9）

#### 測試 4.1: 帳號 A → 帳號 B
**準備：** 2 個不同的 Microsoft 帳號

**操作：**
1. 用帳號 A 登入，確認看到帳號 A 的任務
2. 點擊登出
3. 用帳號 B 登入

**預期：**
- ✅ 看到帳號 B 的用戶名
- ✅ 看到帳號 B 的任務列表（**非**帳號 A 的）
- ✅ 無快取混雜

**驗證：**
```javascript
// 登入帳號 B 後執行
const acct = JSON.parse(localStorage.getItem('ms_account'))
console.log('Current account:', acct.displayName)  // 應為帳號 B
```

**失敗排查：**
如果看到帳號 A 的任務，檢查：
```javascript
// 手動清除舊快取
localStorage.removeItem('rq-mms-todo')
localStorage.removeItem('auth.ms')
localStorage.removeItem('ms_account')
location.reload()
```

---

#### 測試 4.2: 快速重新登入相同帳號
**操作：**
1. 用帳號 A 登入，記下任務列表
2. 點擊登出
3. 立即用帳號 A 重新登入

**預期：**
- ✅ 看到相同的任務（不是舊快取，而是新查詢）
- ✅ 無重複任務
- ✅ 任務載入速度正常（<2 秒）

---

#### 測試 4.3: 帳號切換的跨 Context 同步
**操作：**
1. 帳號 A 登入，Popup 和 SidePanel 都打開
2. 登出並用帳號 B 登入（在 Popup 中）
3. 檢查 SidePanel

**預期：**
- ✅ SidePanel 立即顯示帳號 B 的任務（無需刷新）
- ✅ 同步延遲 <100ms

---

### 🔀 第 5 類：重登時的 UI 同步（改進 10）

#### 測試 5.1: Popup 重登時 SidePanel 立即更新
**操作：**
1. Popup 和 SidePanel 都打開
2. 在 Popup 中點擊登入
3. 完成登入流程
4. 不刷新，直接查看 SidePanel

**預期：**
- ✅ SidePanel 立即顯示「已登入」狀態
- ✅ 無需手動刷新（改進 10）
- ✅ 更新延遲 <200ms

**不應該看到：**
- ❌ SidePanel 仍顯示登入提示
- ❌ 加載轉圈旋轉超過 2 秒

**驗證：**
```javascript
// 登入後，在 Popup Console 執行
const auth = JSON.parse(localStorage.getItem('auth.ms'))
console.log('Auth state:', auth.accessToken ? 'Logged in' : 'Logged out')
```

---

#### 測試 5.2: SidePanel 重登時 Popup 立即更新
**操作：**
1. 從 SidePanel 菜單打開登入流程
2. 完成登入
3. 切換到 Popup

**預期：**
- ✅ Popup 立即顯示任務列表
- ✅ 顯示用戶名和登出按鈕
- ✅ 無需刷新

---

#### 測試 5.3: Phase 和 FlowStep 同步
**操作：** 登入時監控 phase 狀態變化

**驗證：**
```javascript
// 登入流程中，在 Console 多次執行，觀察變化
// 預期序列：prompt → ... → refreshing → ready

// 登入完成後
const isReady = phase === 'ready'
const flowStepCleared = !flowStep
console.log('Ready:', isReady, 'FlowStep cleared:', flowStepCleared)
```

---

## 🎯 測試總結檢查表

### ✅ 必須通過（決定修復是否成功）

- [ ] 初始登入：localStorage 同步，無延遲
- [ ] Token 刷新：自動進行，不中斷操作
- [ ] 完整登出：所有狀態和快取被清除
- [ ] 帳號切換：看到新帳號的任務，無舊資料
- [ ] 跨 Context 同步：Popup/SidePanel 在 <200ms 內同步

### ⚠️ 應該通過（增進用戶體驗）

- [ ] 登出後快速重登：無延遲
- [ ] 多 Context 登出：同時更新
- [ ] Token 刷新重試：自動重試 3 次
- [ ] 錯誤清晰：Console 日誌清晰明瞭

### ❌ 不應該發生

- [ ] 登出後仍有舊帳號數據
- [ ] Token 刷新失敗後卡住
- [ ] 跨 Context 不同步
- [ ] localStorage 和 chrome.storage.local 混用

---

## 📊 快速測試清單（15 分鐘）

如果沒有時間完整測試，至少執行這些：

1. **初始登入** (1 分鐘)
   - 登入 → 確認任務列表出現

2. **登出按鈕** (1 分鐘)
   - 點擊登出 → 確認立即返回登入提示

3. **帳號切換** (3 分鐘)
   - 登出 → 換帳號登入 → 確認看到新帳號的任務

4. **跨 Context 同步** (2 分鐘)
   - Popup 和 SidePanel 都打開 → 在 Popup 登入 → 檢查 SidePanel 是否立即更新

5. **Console 驗證** (5 分鐘)
   - 執行 localStorage 檢查，確認關鍵狀態存在/不存在
   - 查看 Console 日誌，確認無錯誤

6. **Browser DevTools 檢查** (3 分鐘)
   - Application → Local Storage：檢查 auth.ms, rq-mms-todo 等
   - Network：檢查 token 請求是否使用新帳號的 Bearer token

---

## 🔧 故障排查快速指南

### 症狀：登出後仍顯示舊帳號的任務
```javascript
// 手動清除所有快取
localStorage.clear()
chrome.storage.local.clear()
location.reload()
```

### 症狀：SidePanel 不同步
```javascript
// 手動觸發同步（在 SidePanel Console 執行）
chrome.runtime.sendMessage({ action: "auth_changed", auth: null })
```

### 症狀：Token 刷新卡住
```javascript
// 檢查 background.ts 日誌
// 在 chrome://extensions/ 找到擴展 → 檢查「Service Worker」日誌
```

---

## 📞 需要幫助？

1. 查看 DIAGNOSTIC_SCRIPT.js 自動診斷
2. 檢查 Console 日誌中的「Logout completed」或「React Query cache cleared」
3. 參考 LOGOUT_AND_ACCOUNT_FIX.md 和 TESTING_GUIDE.md 中的「常見問題診斷」

---

## ✨ 預期結果

修復完全成功時：
- ✅ 登入：即時，無延遲
- ✅ 登出：完全清除，無殘留
- ✅ 帳號切換：乾淨切換，無快取污染
- ✅ 跨 Context：實時同步
- ✅ Console：清晰的診斷日誌

🎉 準備好測試了嗎？
