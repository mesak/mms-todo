# 變更日誌 - v0.0.3

## 🎉 主要功能：長期免登入機制

### 概述
實作了完整的長期會話管理機制，用戶在首次登入後可以持續數月（最長 90 天）無需重新認證，大幅提升使用體驗。

---

## 📋 詳細變更

### 1. **優化 Token 刷新機制** (`hooks/useAuth.ts`)

#### 新增功能：
- ✅ **智能重試機制**：Token 刷新失敗時自動重試（最多 3 次）
  - 處理網絡錯誤（TypeError）
  - 處理伺服器錯誤（5xx）
  - 處理限流錯誤（429）
  - 使用指數退避策略（1s → 2s → 4s）

- ✅ **主動刷新排程**：Token 過期前 5 分鐘自動刷新
  ```typescript
  // 排程下次刷新
  const timeUntilRefresh = Math.max(0, (t.expires_in - 300) * 1000)
  refreshTimer = setTimeout(() => maybeRefresh(), timeUntilRefresh)
  ```

- ✅ **ensureValidToken() 函數**：主動獲取有效 token
  ```typescript
  const { ensureValidToken } = useAuth()
  const token = await ensureValidToken()
  ```

#### 改進的函數：
- `refreshAccessToken()` - 新增重試參數和邏輯
- `useEffect()` - 新增自動排程機制
- `useAuth()` - 新增 `ensureValidToken` 返回值

---

### 2. **背景服務 Token 管理** (`background.ts`)

#### 新增功能：
- ✅ **定期自動刷新**：使用 `chrome.alarms` API
  - 每 30 分鐘檢查 token 狀態
  - Token 過期前 5 分鐘自動刷新
  - Extension 啟動時立即檢查

- ✅ **背景刷新函數**：
  ```typescript
  async function backgroundRefreshToken() {
    const auth = await getAuth()
    const needsRefresh = auth.expiresAt 
      ? Date.now() >= auth.expiresAt - 300_000 
      : true
    
    if (needsRefresh && auth.refreshToken) {
      const tokens = await refreshAccessToken(auth.refreshToken)
      await setAuth({ /* 更新狀態 */ })
    }
  }
  ```

- ✅ **跨組件通知**：Token 刷新後廣播給 UI 組件
  ```typescript
  chrome.runtime.sendMessage({ 
    action: "token_refreshed", 
    token: next.accessToken 
  })
  ```

#### 新增的常量和函數：
- `AUTH_KEY`, `TOKEN_ENDPOINT`, `CLIENT_ID`, `SCOPES`
- `getAuth()`, `setAuth()`
- `refreshAccessToken()` - 背景版本
- `backgroundRefreshToken()` - 主要背景刷新邏輯
- Alarm 監聽器和初始化邏輯

---

### 3. **權限更新** (`package.json`)

#### 新增權限：
```json
{
  "permissions": [
    "identity",
    "storage",
    "notifications",
    "alarms"  // ← 新增
  ]
}
```

**用途**：支援背景服務定期刷新 token

---

### 4. **完整文檔**

#### 新增文檔：
1. **`docs/LONG_SESSION_IMPLEMENTATION.md`**
   - 使用指南
   - 實作細節
   - 測試方法
   - 常見問題
   - 最佳實踐

2. **更新 `docs/MICROSOFT_API_LONG_SESSION_ANALYSIS.md`**
   - 詳細的技術分析
   - 完整的實作說明
   - 改進歷程記錄
   - 測試場景

---

## 🔄 工作流程

### Token 生命週期：

```
1. 用戶首次登入
   ↓
2. 獲取 Access Token (1小時) + Refresh Token (90天)
   ↓
3. 存儲在 chrome.storage.local
   ↓
4. UI 層監控 (hooks/useAuth.ts)
   - Token 過期前 5 分鐘刷新
   - 自動排程下次刷新
   ↓
5. 背景服務監控 (background.ts)
   - 每 30 分鐘檢查
   - Extension 啟動時檢查
   ↓
6. Token 保持有效（最長 90 天）
   ↓
7. 90 天後或用戶撤銷權限 → 需要重新登入
```

---

## 🧪 測試

### 自動化測試場景：
- ✅ 登入後關閉瀏覽器 → 重新開啟無需登入
- ✅ 等待 1 小時 → Access Token 自動刷新
- ✅ 長期未使用（30 天）→ 背景服務保持登入
- ✅ 網絡暫時中斷 → 自動重試不會登出
- ✅ 90 天後 → 提示重新登入

### 手動測試方法：
見 `docs/LONG_SESSION_IMPLEMENTATION.md` 的測試章節

---

## 🎯 效益

### 用戶體驗提升：
- ✅ **無縫使用**：首次登入後長期免登入
- ✅ **高可用性**：暫時性錯誤不會中斷服務
- ✅ **背景維護**：即使不打開擴展也保持登入

### 技術優勢：
- ✅ **多層保護**：UI 層 + 背景服務雙重保障
- ✅ **智能重試**：處理網絡波動和暫時性錯誤
- ✅ **可觀測性**：完整的日誌和狀態監控

### 安全性：
- ✅ **PKCE 保護**：防止授權碼攔截
- ✅ **Token 隔離**：使用 chrome.storage.local 安全存儲
- ✅ **自動失效**：用戶撤銷權限時自動清除

---

## 📦 升級指南

### 從舊版本升級：
1. 拉取最新代碼
2. 執行 `pnpm install`（確保依賴更新）
3. 執行 `pnpm build`
4. 重新載入 Extension

### 注意事項：
- 已登入的用戶會自動受益於新的刷新機制
- 無需重新登入
- 背景服務會自動啟動

---

## 🐛 已知問題

無

---

## 🔮 未來計劃

- [ ] 添加 token 刷新失敗的用戶通知
- [ ] 實作更詳細的刷新狀態指示器
- [ ] 支援多賬戶管理
- [ ] 優化背景服務的電池消耗

---

## 📚 參考資源

- [長期會話實作指南](./docs/LONG_SESSION_IMPLEMENTATION.md)
- [Microsoft API 長期免登入機制分析](./docs/MICROSOFT_API_LONG_SESSION_ANALYSIS.md)
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)
- [Chrome Extension Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)

---

**發布日期**: 2025-10-23  
**版本**: 0.0.3  
**類型**: 功能增強 + 優化
