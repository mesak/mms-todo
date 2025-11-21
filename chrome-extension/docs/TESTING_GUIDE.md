# 快速測試指南 - 修改驗證

## 🚀 啟動開發環境

已完成：✅ 代碼已改進並構建成功

```bash
pnpm dev
```

在 Chrome 中載入未打包的擴展：
1. 打開 chrome://extensions/
2. 啟用「開發者模式」
3. 點擊「載入未打包」
4. 選擇 `/build/chrome-mv3-dev` 目錄

---

## 📋 測試清單

### ✅ 測試 1: 登入（5 分鐘）

**步驟：**
1. 打開擴展的 Popup（點擊擴展圖標）
2. 應該看到「Sign In」按鈕
3. 點擊登入
4. 完成 Microsoft 登入流程
5. 應立即回到 Popup，顯示已登入狀態

**預期結果：**
- ✅ 登入後 **無加載轉圈**（這是關鍵改進！）
- ✅ 任務列表立即顯示
- ✅ 能夠看到 Microsoft To Do 中的任務

**如果失敗：**
- 檢查瀏覽器控制台（F12）是否有錯誤
- 執行診斷腳本 (DIAGNOSTIC_SCRIPT.js)

---

### ✅ 測試 2: 狀態恢復（5 分鐘）

**步驟：**
1. 確保已登入
2. **完全關閉擴展**：
   - 在 chrome://extensions/ 中禁用擴展
   - 等待 5 秒
   - 重新啟用擴展
3. 打開 Popup

**預期結果：**
- ✅ **立即看到已登入狀態**（無加載延遲！）
- ✅ Token 自動從 localStorage 恢復
- ✅ 任務列表立即顯示

**如果失敗：**
- localStorage 可能被清除
- 執行 DIAGNOSTIC_SCRIPT.js 檢查狀態

---

### ✅ 測試 3: 多 Context 同步（10 分鐘）

**步驟：**
1. 打開 Popup（已登入）
2. 點擊擴展圖標上的側邊欄圖標（或按 Ctrl+Q）打開 SidePanel
3. Popup 和 SidePanel 應同時顯示任務
4. 在其中一個中修改任務（例如：標記為完成）
5. 檢查另一個是否立即更新

**預期結果：**
- ✅ 兩個 Context 的認證狀態一致
- ✅ 任務狀態實時同步

---

### ✅ 測試 4: 網路恢復（15 分鐘）

**步驟：**
1. 打開擴展 DevTools：
   - 在 Popup/SidePanel 中按 F12
   - 進入 Console
2. 確保已登入且 token 將在不久後過期（或手動刪除 localStorage 中的 token 來模擬過期）
3. 關閉網路：
   - DevTools → Network → Offline
4. 等待 10 秒（模擬刷新嘗試）
5. 恢復網路

**預期結果：**
- ✅ 關閉網路時：顯示錯誤或保持現有狀態
- ✅ 恢復網路 10-30 秒後：自動重試
- ✅ **不會要求重新登入**（這是關鍵改進！）
- ✅ Console 中應看到重試日誌

**日誌示例：**
```
Token refresh failed with 500, retrying in 1000ms... (attempt 1/3)
Token refresh failed with 500, retrying in 2000ms... (attempt 2/3)
Token 已刷新
```

---

### ✅ 測試 5: Console 診斷（5 分鐘）

**步驟：**
1. 在擴展 Popup/SidePanel 中按 F12
2. 進入 Console 標籤
3. 複製並執行 `DIAGNOSTIC_SCRIPT.js` 的內容
4. 查看輸出

**預期結果：**
```
✅ localStorage 中找到 auth.ms
⏱️ Token 有效期：1439 分鐘後過期
✅ 找到 refresh token
✅ localStorage 有，chrome.storage.local 無 - 已成功遷移
✅ 已登入，Token 有效
✅ 無進行中的登入流程
✅ 看起來一切正常
```

---

## 🔍 常見問題診斷

### 問題 1: 登入後仍看到加載轉圈

**可能原因：**
- React Query 正在初始化
- Graph API 調用延遲

**解決方案：**
1. 等待 2-3 秒
2. 檢查 Console 是否有錯誤
3. 執行 DIAGNOSTIC_SCRIPT.js

### 問題 2: Token 無法恢復（關閉後重新打開）

**可能原因：**
- localStorage 被清除（Chrome 設置問題）
- 舊的 chrome.storage.local 數據沒有遷移

**解決方案：**
1. 執行診斷腳本
2. 如果顯示「chrome.storage.local 有，localStorage 無」，手動遷移：
```javascript
// 在 Console 中執行
const stored = await new Promise(resolve => {
    chrome.storage.local.get(['auth.ms'], (res) => {
        resolve(res['auth.ms'])
    })
})
localStorage.setItem('auth.ms', JSON.stringify(stored))
```

### 問題 3: 網路錯誤時立即退出登入

**可能原因：**
- 重試邏輯未生效
- Token 真的過期了（invalid_grant）

**解決方案：**
1. 檢查 Console 日誌
2. 如果看到 `invalid_grant`，需要重新登入
3. 否則應該自動重試

### 問題 4: Popup 和 SidePanel 狀態不同步

**可能原因：**
- localStorage 事件監聽未工作
- Chrome 消息傳遞有問題

**解決方案：**
1. 檢查 Console 是否有消息傳遞錯誤
2. 嘗試刷新其中一個窗口
3. 關閉後重新打開

---

## 📊 性能檢查

### 啟動時間

**測量方法：**
1. 完全關閉擴展
2. 重新打開 Popup
3. 查看從點擊到顯示任務列表的時間

**預期：**
- 改進前：2-3 秒（包括加載延遲）
- 改進後：<500ms（因為 localStorage 同步）

### Network 標籤

打開 DevTools 的 Network 標籤，查看 API 調用：

**預期請求：**
1. `/me` - 獲取用戶信息 ✅
2. `/me/todo/lists` - 獲取任務列表 ✅

**不應該看到：**
- ❌ 多次重複的 `/me` 或 `/lists` 調用

---

## ✅ 完整驗收標準

修復成功需要滿足：

| 項目 | 預期 | 狀態 |
|------|------|------|
| 登入後立即可用 | ✅ 無加載轉圈 | [ ] |
| 關閉/打開恢復 | ✅ <500ms 恢復 | [ ] |
| 多 Context 同步 | ✅ 實時同步 | [ ] |
| 網路恢復 | ✅ 自動重試 | [ ] |
| Console 日誌 | ✅ 清晰的重試日誌 | [ ] |
| Token 刷新 | ✅ 5 分鐘前自動 | [ ] |

---

## 📝 記錄結果

### 成功案例

如果所有測試通過，記錄：

```markdown
✅ 修復驗證完成

日期：2024-11-03
測試：所有項目通過
性能：<500ms 恢復
備註：[任何其他觀察]
```

### 問題反饋

如果有問題，記錄：

```markdown
❌ 測試失敗：[具體項目]

症狀：[詳細描述]
Console 錯誤：[複製粘貼]
診斷結果：[DIAGNOSTIC_SCRIPT.js 的輸出]
```

---

## 🔧 回滾（如需要）

如果需要回滾到原始版本：

```bash
cp hooks/useAuth.ts.backup hooks/useAuth.ts
pnpm build
```

---

## ❓ 需要幫助？

1. 首先執行 `DIAGNOSTIC_SCRIPT.js`
2. 檢查 Console 日誌
3. 參考對應的「常見問題診斷」部分
4. 如問題持續，備份診斷結果以便後續分析

祝測試順利！ 🎉
