# SidePanel 切換功能改進

## 📋 變更摘要

改進了 Popup 中「開啟 Panel」按鈕的行為，現在能夠智能檢測 SidePanel 狀態：

- ✅ **SidePanel 未打開** → 正常打開 SidePanel
- ✅ **SidePanel 已打開** → 切換焦點到 SidePanel（而非什麼都不做）

## 🔧 技術實作

### 修改文件
- [popup.tsx](file:///home/mesak/plugins/chrome/mms-todo/chrome-extension/popup.tsx#L32-L74)

### 核心邏輯

```typescript
const openSidePanel = React.useMemo(() => debounce(async () => {
    const c: any = (globalThis as any).chrome
    if (!c?.tabs?.query || !c?.sidePanel?.open) return

    try {
        // 1. 獲取當前活動標籤
        const tabs = await new Promise<any[]>((resolve) => {
            c.tabs.query({ active: true, currentWindow: true }, resolve)
        })
        const tabId = tabs[0]?.id

        // 2. 檢查 SidePanel 是否已打開
        const options = await c.sidePanel.getOptions({ tabId })
        
        if (options?.enabled) {
            // 3a. 已打開 → 重新打開以聚焦
            console.log("[popup] SidePanel already open, attempting to focus")
            await c.sidePanel.open({ tabId })
            
            // 3b. 備用：更新窗口焦點
            const currentWindow = await c.windows.getCurrent()
            if (currentWindow?.id) {
                await c.windows.update(currentWindow.id, { focused: true })
            }
        } else {
            // 4. 未打開 → 正常打開
            console.log("[popup] Opening SidePanel")
            await c.sidePanel.open({ tabId })
        }
    } catch (error) {
        // 5. 錯誤處理：回退到簡單打開
        console.error("[popup] Failed to open/switch SidePanel:", error)
        // ... 回退邏輯
    }
}, 500, true, false), [])
```

## 🧪 測試指南

### 測試案例 1：SidePanel 未打開

**步驟**：
1. 確保 SidePanel 未打開
2. 點擊 Popup 中的 Panel 圖示（PanelRightOpen）

**預期結果**：
- ✅ SidePanel 打開
- ✅ Console 顯示：`[popup] Opening SidePanel`

### 測試案例 2：SidePanel 已打開

**步驟**：
1. 先打開 SidePanel
2. 點擊瀏覽器工具列的 Popup 圖示，打開 Popup
3. 在 Popup 中點擊 Panel 圖示

**預期結果**：
- ✅ 焦點切換到 SidePanel（SidePanel 會被聚焦）
- ✅ Console 顯示：`[popup] SidePanel already open, attempting to focus`
- ✅ 可以看到 SidePanel 變成當前聚焦的視窗

### 測試案例 3：錯誤回退

**步驟**：
1. 在不支持 `getOptions` 的環境中測試
2. 點擊 Panel 圖示

**預期結果**：
- ✅ 仍能正常打開 SidePanel（回退邏輯生效）
- ⚠️ Console 可能顯示錯誤，但功能不受影響

## 🎯 使用場景

### 場景 1：快速切換回 SidePanel
用戶在瀏覽網頁時打開了 SidePanel，後來切換到其他窗口。現在想要快速切換回 SidePanel：
1. 點擊瀏覽器工具列的 Popup 圖示
2. 點擊 Panel 圖示
3. ✅ 立即聚焦到 SidePanel

### 場景 2：首次打開 SidePanel
用戶首次使用：
1. 點擊 Popup 中的 Panel 圖示
2. ✅ SidePanel 正常打開

## 📊 改進對比

| 行為 | 修改前 | 修改後 |
|------|--------|--------|
| SidePanel 未打開 | ✅ 正常打開 | ✅ 正常打開 |
| SidePanel 已打開 | ❌ 無反應或重複打開 | ✅ 切換焦點到 SidePanel |
| 錯誤處理 | ⚠️ 可能失敗 | ✅ 回退到簡單打開 |
| 用戶體驗 | ⚠️ 不明確 | ✅ 一致且符合預期 |

## 🔍 Debug 資訊

啟用開發模式後，Console 會顯示：

```
[popup] SidePanel already open, attempting to focus
```
或
```
[popup] Opening SidePanel
```

這有助於診斷 SidePanel 狀態。

## 🚀 部署

修改會在下次 `pnpm dev` 或 `pnpm build` 後生效。

當前開發伺服器正在執行中，修改應該會自動熱更新。

## ⚠️ 注意事項

1. **Chrome API 依賴**：需要 Chrome 114+ 才支援 `sidePanel.getOptions()`
2. **權限要求**：確保 manifest 中有 `sidePanel` 權限
3. **Tab 上下文**：SidePanel 需要在有效的 tab 上下文中打開

## 📝 後續改進建議

- [ ] 增加視覺反饋（例如按鈕狀態指示 SidePanel 是否已打開）
- [ ] 考慮增加快捷鍵支援
- [ ] 增加關閉 SidePanel 的功能
