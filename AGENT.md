# AGENT 指南 (維護者/自動化代理)

本文件旨在協助維護者與自動化代理（Agent）理解本專案的架構與開發流程。內容涵蓋了專案的雙重架構、資料模型、關鍵慣例與未來的開發路線圖。

## 1. 專案宗旨與架構演進

本專案是一個瀏覽器擴充功能（Chrome, MV3），旨在提供一個簡潔高效的待辦清單（Todo）管理工具。

- **當前狀態**: 目前版本是一個功能完整的**本地待辦清單**擴充功能。所有資料都安全地儲存在 `chrome.storage.local` 中，無需網路連線即可使用。
- **未來目標**: 專案的最終目標是與 **Microsoft To Do** 進行深度整合，實現資料的雲端同步與跨裝置存取。
- **核心架構**: 專案正處於一個「混合架構」的過渡階段。目前的 UI 完全由本地儲存驅動，但底層已經內建了與 Microsoft Graph API 互動的完整 hooks，為未來的整合鋪平了道路。

## 2. 技術棧

- **框架**: React 18, TypeScript 5
- **打包工具**: Plasmo (專為瀏覽器擴充功能設計)
- **狀態管理/快取**: TanStack React Query v5
- **UI**: Tailwind CSS + shadcn 風格組件 (基於 Radix UI)
- **API 互動**: `fetch` API (用於 Microsoft Graph)

## 3. 兩種資料來源模式

本專案包含兩套並行的資料處理邏輯，分別對應本地儲存和遠端 API。

### 3.1. 本地儲存模式 (`hooks/useTodos.ts`)

這是**目前 UI 唯一使用的模式**。

- **資料來源**: `chrome.storage.local`
- **儲存鍵**:
  - `todoTasks`: `TodoTask[]`
  - `todoLists`: `TodoList[]`
- **核心 Hooks**: `useTodoTasks`, `useTodoLists`
- **資料模型** (定義於 `types/todo.ts`):
  - `TodoList`: `{ id, name, createdAt }`
  - `TodoTask`: `{ id, title, completed, todoListId, createdAt }`
- **備註**: 此模式提供離線功能，並在沒有 Microsoft 帳戶登入時作為預設選項。

### 3.2. Microsoft Graph API 模式 (`hooks/useMsTodos.ts`)

這代表了專案的**未來整合方向**，目前已完成底層 hook 開發，但尚未與 UI 連接。

- **資料來源**: Microsoft Graph API
- **API 端點**: `https://graph.microsoft.com/v1.0/me/todo/...`
- **必要條件**: 一個有效的 Microsoft Graph API access token (需透過 OAuth 2.0 取得)。
- **核心 Hooks**: `useMsTodoLists`, `useMsTasks`, `useCreateMsTask` 等。
- **資料模型** (定義於 `hooks/useMsTodos.ts`):
  - `TodoTaskList`: `{ id, displayName, ... }`
  - `TodoTask`: `{ id, title, status, importance, body, ... }`
- **備註**: 此模式的模型比本地模型更豐富。在實現整合時，需要注意欄位的對應關係（例如 `name` vs `displayName`, `completed` vs `status`)。

## 4. 認證流程 (待辦事項)

為了啟用 Microsoft To Do 同步功能，需要完成 OAuth 2.0 的認證流程。`package.json` 中的 `manifest` 已預先設定了必要的權限 (`identity`, `oauth2`)。

**待辦的實現步驟**:
1.  在 UI (建議 `options.tsx` 或 `sidepanel.tsx` 的設定區) 新增「使用 Microsoft 帳戶登入/登出」的按鈕。
2.  **登入**: 呼叫 `chrome.identity.getAuthToken({ interactive: true })` 來觸發 OAuth 流程並獲取 access token。
3.  **儲存 Token**: 將獲取到的 token 儲存在一個安全的地方，例如 React Context、全域狀態或 `chrome.storage.session`（非永久儲存）。
4.  **傳遞 Token**: 將 token 傳遞給 `useMsTodos.ts` 中的各個 hooks。
5.  **登出**: 呼叫 `chrome.identity.removeCachedAuthToken` 來清除 token，並將應用程式狀態切換回本地模式。

## 5. 關鍵入口與組件

- `popup.tsx`: 彈出視窗。目前用於快速新增和檢視**本地**任務。
- `sidepanel.tsx`: 側邊面板。提供完整的**本地**清單和任務管理介面。
- `options.tsx`: 設定頁。目前僅用於儲存本地設定，是實現**登入功能**的理想位置。
- `hooks/useTodos.ts`: 本地資料邏輯的核心。
- `hooks/useMsTodos.ts`: 遠端資料邏輯的核心。
- `providers.tsx`: 全域 `QueryClientProvider`，包裹整個應用。

## 6. 常見修改場景與指引

### 場景 1: 在 UI 中顯示 MS To Do 的資料

1.  **完成認證流程**: 參考第 4 節的步驟。
2.  **條件性呼叫 Hooks**: 在 `sidepanel.tsx` 或 `popup.tsx` 中，根據使用者的登入狀態（即是否存在 token），來決定是呼叫 `useMsTodoLists` / `useMsTasks` 還是 `useTodoLists` / `useTodoTasks`。
3.  **適應資料模型**: 調整 UI 元件以顯示來自 Graph API 的資料（例如，使用 `task.displayName` 而非 `task.name`）。

### 場景 2: 實現雙向同步

這是一個進階目標，需要謹慎設計。
- **策略**: 決定同步的觸發時機（例如，啟動時、手動觸發、定期輪詢）。
- **衝突解決**: 需要設計策略來處理本地與遠端的資料衝突。
- **建議**: 初期可以先實現**單一資料來源模式**（登入後只使用遠端資料，登出後只使用本地資料），這樣可以避免同步的複雜性。

## 7. 發佈與 CI

- 本地打包: `pnpm package` 會產生 `build/chrome-mv3-prod.zip`。
- CI/CD: `.github/workflows/submit.yml` 使用 Plasmo 的 GitHub Action 進行自動提交。
- **注意**: 若要使 OAuth 正常運作，發佈到 Chrome 商店的擴充功能 ID 必須與在 Google API Console 和 Azure AD 應用程式中註冊的 ID 一致。

## 8. 待辦清單 (可由 Agent 自動化)

- **[ ] 實現 Microsoft 帳戶登入/登出功能 (參考第 4 節)。**
- **[ ] 在 UI 中根據登入狀態，切換使用本地或遠端資料來源。**
- [ ] 加入 UI 通知 (Toast) 以改善使用者操作回饋。
- [ ] 提供匯出/匯入本地資料 (JSON) 的功能。
- [ ] 探索 i18n 國際化方案。

---
若要進行非向後相容的更動，請在 PR 中清楚標註破壞性改動與遷移步驟。
