# 🔧 Popup UI 更新問題修復驗證

## 問題概述
- ❌ 從 Popup 登入後，UI 沒有刷新為任務列表
- ❌ 從 Popup 登出後，UI 沒有消失（仍顯示任務列表）

## 根本原因

在 popup.tsx 中：
1. `PopupContent` 調用 `useAuth()` 獲得 auth 對象
2. `UserIndicator` 也調用 `useAuth()` 獲得同一個對象

由於 React 的 hook 機制，不同的組件調用 `useAuth()` 會創建**不同的實例**。

當 UserIndicator 調用 logout 時：
- UserIndicator 的 useAuth 實例被更新
- PopupContent 的 useAuth 實例看不到這個改變
- AuthGate 使用 PopupContent 的 auth 對象，所以看不到登出狀態

## 應用的修復

### 修復 1：添加 logout_completed 消息監聽（useAuth.ts）
```typescript
// 在消息監聽器中添加對 logout_completed 的處理
if (message.action === "logout_completed") {
    setAuthState({})
    setPhase("prompt")
    setFlowStep(undefined)
}
```

**作用：** 確保所有 useAuth 實例都能收到並響應登出信號

### 修復 2：共享 auth 對象（popup.tsx）
```typescript
// PopupContent 中調用 useAuth
const auth = useAuth()

// 將 auth 對象傳給 UserIndicator，而不是讓它自己調用 useAuth
<UserIndicator auth={auth} />
```

**作用：** 確保 UserIndicator 使用 PopupContent 的同一個 useAuth 實例

## 測試步驟

### 快速測試（5 分鐘）

#### 測試 1：登入
1. 打開 Popup
2. 點擊「Sign In」按鈕
3. 完成登入流程

**預期結果：**
- ✅ Popup 立即顯示任務列表
- ✅ 不需要手動刷新
- ✅ Console 顯示日誌：
  ```
  [useAuth] Login started
  [useAuth] Login token exchange successful, updating state
  [useAuth] Auth state updated, setting phase to ready
  [popup] PopupContent rendered, isLoggedIn: true
  ```

#### 測試 2：登出
1. 已登入狀態
2. 點擊右上角用戶圖標
3. 選擇「Sign Out」

**預期結果：**
- ✅ Popup 立即顯示「Sign In」提示
- ✅ 用戶圖標消失
- ✅ 不需要手動刷新
- ✅ Console 顯示日誌：
  ```
  [useAuth] Logout started
  [useAuth] Clearing auth state, setting phase to prompt
  [popup] Logout button clicked
  [useAuth] Received logout_completed message
  [popup] PopupContent rendered, isLoggedIn: false
  ```

#### 測試 3：localStorage 驗證
登出後，執行：
```javascript
console.log('auth.ms:', localStorage.getItem('auth.ms'))        // null
console.log('ms_account:', localStorage.getItem('ms_account'))  // null
console.log('rq-mms-todo:', localStorage.getItem('rq-mms-todo'))  // null
```

**預期結果：**
- ✅ 所有認證相關的 localStorage 都被清除

---

## 驗證清單

### ✅ 必須通過的測試

- [ ] 登入後 UI 立即更新為任務列表
- [ ] 登出後 UI 立即更新為登入提示
- [ ] 無需手動刷新 Popup
- [ ] localStorage 被完全清除
- [ ] Console 中有清晰的日誌

### ⚠️ 應該通過的測試

- [ ] 登入/登出過程中無錯誤
- [ ] 快速連續登入/登出工作正常
- [ ] 帳號切換正常顯示新帳號的任務

---

## 故障排查

### 問題：登出後 Popup 仍顯示任務列表

**排查步驟：**
1. 打開 DevTools (F12)
2. 查看 Console 是否有錯誤
3. 查看是否有「Logout started」日誌
4. 檢查 localStorage 是否被清除

**可能原因：**
- logout 函數沒有被調用 → 檢查點擊事件
- useAuth 實例沒有收到消息 → 檢查消息監聽器

**手動修復：**
```javascript
// 在 Console 執行
localStorage.removeItem('auth.ms')
localStorage.removeItem('ms_account')
localStorage.removeItem('rq-mms-todo')
location.reload()
```

### 問題：登入後無限加載

**排查步驟：**
1. 查看 Console 中的錯誤
2. 檢查網路標籤中的 API 請求
3. 驗證 access_token 是否有效

### 問題：日誌中沒有「Logout started」

**原因：**
- logout 函數沒有被調用
- 可能是 debounce 的問題（leading=true, trailing=false）

**驗證：**
```javascript
// 在 Console 執行
window.debugLogout = async () => {
    const { logout } = window.__AUTH__ || {}
    if (logout) {
        console.log("Calling logout directly...")
        await logout()
    } else {
        console.log("logout function not found")
    }
}

// 然後手動調用
debugLogout()
```

---

## 關鍵代碼位置

| 文件 | 行數 | 改變 |
|------|------|------|
| useAuth.ts | 107-136 | 添加 logout_completed 消息監聽 |
| popup.tsx | 17-20 | 添加調試日誌 |
| popup.tsx | 61 | 傳遞 auth 給 UserIndicator |
| popup.tsx | 91-107 | UserIndicator 接收 auth 參數 |

---

## 下一步

### 立即執行
```bash
# 1. 重新載入擴展
# chrome://extensions/ → 禁用後啟用

# 2. 打開 Popup 並按上述測試步驟測試

# 3. 查看 Console 日誌確認修復
```

### 如果測試通過
- ✅ 修復完成
- ✅ 準備部署
- ✅ 可以移除調試日誌（可選）

### 如果測試失敗
1. 查看 Console 中的錯誤信息
2. 參考「故障排查」部分
3. 檢查代碼是否完整應用

---

## 技術細節

### 為什麼多個 useAuth 實例會導致問題？

```typescript
// 錯誤的方式（修復前）
function PopupContent() {
    const auth = useAuth()  // 實例 A
    return <UserIndicator />
}

function UserIndicator() {
    const auth = useAuth()  // 實例 B（不同！）
    // logout 只更新實例 B，PopupContent 看不到
}

// 正確的方式（修復後）
function PopupContent() {
    const auth = useAuth()  // 實例 A
    return <UserIndicator auth={auth} />  // 傳遞相同實例
}

function UserIndicator({ auth }) {
    // 使用傳入的實例 A
    // logout 更新實例 A，PopupContent 立即看到
}
```

---

## 改進版本號

- **Improvement 11：** 消息監聽器增強（logout_completed）
- **Improvement 12：** Popup UI 同步修復（共享 useAuth 實例）

---

**修復日期：** 2025-11-03  
**構建狀態：** ✅ 成功  
**測試狀態：** ⏳ 待驗證
