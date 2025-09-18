# AGENT 指南（維護者/自動化代理）

本文件面向維護者與自動化代理（Agent）。內容包含架構總覽、資料契約、狀態流、關鍵慣例與修改指南，協助你在不破壞既有功能的前提下安全地擴充此專案。

## 專案宗旨
- 瀏覽器擴充功能（Chrome，MV3），提供簡潔的待辦清單（Todo）與類別管理。
- 介面包含 Popup、Side Panel 與 Options 頁。
- 全部資料儲存在 `chrome.storage.local`，不依賴雲端後端。

## 技術棧與核心套件
- React 18、TypeScript 5
- Plasmo（打包/產生 MV3 入口）
- TanStack React Query（快取與資料同步）
- Tailwind CSS + shadcn 風格 UI 組件 + Radix UI

## 重要入口與組件
- `popup.tsx`：彈出視窗入口。可選取類別並新增/檢視 Todo，含「開啟側邊面板」按鈕。
- `sidepanel.tsx`：側邊面板入口。左側為類別清單（可新增/重新命名/刪除），右側為 Todo 清單。
- `options.tsx`：擴充功能設定頁（目前示範儲存 username）。
- `providers.tsx`：建立全域 `QueryClient` 並以 `QueryClientProvider` 包裹應用。
- `hooks/useTodos.ts`：封裝 Todo 與 Category 的查詢/變更；資料來源為 `chrome.storage.local`。
- `ui/TodoList.tsx`：Todo 清單的主要 UI 與互動。
- `components/ui/*` 與 `components/sidepanel/*`：UI 原子元件與側邊欄骨架。

## 資料模型（契約）
檔案：`types/todo.ts`

- Category
  - `id: string`
  - `name: string`
  - `color?: string`
  - `createdAt: number`

- Todo
  - `id: string`
  - `title: string`
  - `completed: boolean`
  - `categoryId: string`
  - `createdAt: number`

注意：
- 類別在初始載入時，若不存在，會自動建立預設類別：`{ id: "work", name: "工作" }`。
- 預設類別 `work` 不能被刪除。

## 儲存鍵值（chrome.storage.local）
- `todos`：Todo[]
- `categories`：Category[]
- `settings`：Options 頁設定（目前僅 `{ username }`）
- `sidebarCollapsed`：布林值，記錄側邊欄收合狀態（`components/ui/sidebar.tsx`）

## React Query 使用慣例
- 查詢鍵（Query Keys）
  - Todos：`["todos", selectedCategoryId]`（若未指定類別，回傳所有 Todos）
  - Categories：`["categories"]`
- 變更（Mutations）完成後一律 `invalidateQueries`：
  - Todos 相關變更：`invalidateQueries({ queryKey: ["todos"] })`
  - Categories 相關變更：`invalidateQueries({ queryKey: ["categories"] })`

## 使用者流程與邏輯
- Popup：
  - 可切換「類別」與新增 Todo。
  - 可點擊按鈕開啟 Side Panel：`chrome.sidePanel.open({ tabId })`。
- Side Panel：
  - 左側清單可新增/重新命名/刪除類別（`work` 例外）。
  - 刪除類別時，若該類別仍有未完成 Todo，會先 `confirm` 提示。
  - 右側為 TodoList，可新增/完成/刪除。
- Options：
  - 存取 `settings.username`。

## 邊界條件與注意事項
- `crypto.randomUUID()` 用於產生 ID。需在 MV3 環境執行（Chrome 支援）。
- 刪除類別時的連動：
  - 類別刪除後，該類別下的 Todos 會逐一刪除（呼叫 `removeTodo.mutate`）。
  - 若刪除的是當前選取類別，會切換到剩餘第一個類別（如存在）。
- 初次載入無類別時會自動建立 `work`；UI 預設選取 `work`。
- 文案目前為繁體中文（未導入 i18n）。

## 程式風格
- 使用 Prettier 3 與 `@ianvs/prettier-plugin-sort-imports`（見 `.prettierrc.mjs`）。
- Tailwind 以 `cn`（`lib/utils.ts`）合併 class。
- 請避免在 UI 元件中進行與儲存層強耦合的邏輯；存取儲存層請透過 hooks。

## 常見修改場景與指引
1) 新增 Todo 欄位（例如 `dueDate`）
- 更新 `types/todo.ts`。
- 在 `hooks/useTodos.ts` 中，新增/更新寫入時補齊預設值。必要時考慮在讀取時做一次性資料遷移（針對舊資料缺欄位）。
- 調整 `ui/TodoList.tsx` 與相關顯示/輸入。

2) 新增類別屬性（例如 `color`）
- 更新 `types/todo.ts` 與 `hooks/useTodos.ts` 的 `add/update` 流程。
- 在側邊欄顯示該屬性（`components/sidepanel/app-sidebar.tsx`）。

3) 調整 Query Key 或快取策略
- 若變更 Query Key，務必同步 `invalidateQueries` 的 key。
- 若改變 `staleTime`/`refetchOnWindowFocus` 等行為，請於 `providers.tsx` 統一設定。

4) 新增新頁面/內容腳本
- 依 Plasmo 規範在專案根目錄新增對應檔案（例如 `content.ts`、`newpage.tsx`），Plasmo 會自動產出對應 entry。

5) 錯誤處理/回饋
- 目前 mutation error 僅在 console 紀錄。若要導入 UI 通知，建議封裝一個 Toast/HUD 元件並在 hooks 的 `onError` 或呼叫端處理。

## 發佈與 CI
- 本地：`pnpm package` 會輸出 ZIP 檔至 `build/chrome-mv3-prod.zip`。
- GitHub Actions：`.github/workflows/submit.yml` 使用 `PlasmoHQ/bpp@v3`，需要在 repo secrets 設定 `SUBMIT_KEYS`。
- CI 目前使用 Node 16（`setup-node@v3`），本機開發建議 Node 18+ 亦可，但請確保與 CI 行為一致。

## 待辦清單（可由 Agent 自動化）
- [ ] 加入基本測試與型別檢查流程（例如 `tsc --noEmit` CI step）。
- [ ] 加入 UI 通知（Toast）以改善使用者回饋。
- [ ] 匯入/匯出資料（JSON）功能。
- [ ] 可選深色主題切換。
- [ ] i18n 架構。

---
若要進行非向後相容的更動，請在 PR 中清楚標註破壞性改動與遷移步驟。
