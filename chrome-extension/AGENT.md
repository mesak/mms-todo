# AGENT 指南 (v2 - MS Graph API)

本文件旨在協助維護者與自動化代理（Agent）快速理解此專案的 **Microsoft Graph API 整合版本**。內容涵蓋了當前的架構、認證流程、資料管理、關鍵慣例與修改指南。

**核心變更**：本專案已從 `chrome.storage.local` 儲存待辦事項，遷移至完全由 **Microsoft To Do** 作為後端，透過 MS Graph API 進行資料同步。

## 專案宗旨
- 一個與 Microsoft To Do 即時同步的瀏覽器擴充功能（Chrome MV3）。
- 使用者透過 Microsoft 帳號登入後，即可在擴充功能中管理他們的待辦清單與任務。
- 提供 Popup、Side Panel、Options 等多個介面，方便快速存取。

## 技術棧
- React 18, TypeScript 5
- **Microsoft Graph API**: 作為核心後端服務。
- **TanStack React Query v5**: 用於非同步狀態管理（伺服器狀態快取、同步）。
- **Plasmo**: 用於建構與打包 Chrome MV3 擴充功能。
- **`chrome.identity.launchWebAuthFlow`**: 用於處理 OAuth 2.0 PKCE 認證流程。
- Tailwind CSS + shadcn/ui: 用於 UI 設計。

## 核心檔案與架構概覽

```
/
├── hooks/
│   ├── useAuth.ts          # 【認證核心】處理使用者登入、登出、Token 刷新。
│   └── useMsTodos.ts       # 【資料核心】提供所有 MS Graph ToDo 相關的 React Query Hooks。
├── lib/
│   └── msgraph.ts          # 提供基礎的 `graphFetch` 函式，用於呼叫 Graph API。
├── background.ts           # 背景腳本，主要用於接收訊息、顯示通知、處理登入後的帳號設定。
├── popup.tsx               # Popup 介面，顯示登入按鈕或任務列表。
├── sidepanel.tsx           # Side Panel 介面，顯示完整的清單與任務管理。
├── providers.tsx           # 提供全域的 React Query `QueryClient`。
└── package.json            # 包含 `manifest` 相關設定，如 client_id, scopes 等。
```

## 身份驗證流程 (OAuth 2.0 + PKCE)

1.  **觸發點**：使用者在 UI (例如 `popup.tsx`) 中點擊「登入」按鈕。
2.  **核心邏輯**：`hooks/useAuth.ts` 中的 `login` 函式被呼叫。
3.  **手動 PKCE 流程**：
    - `useAuth` 會產生 `code_verifier` 和 `code_challenge`。
    - 構造包含 `client_id`, `scope`, `redirect_uri`, `code_challenge` 的授權 URL。
    - 呼叫 `chrome.identity.launchWebAuthFlow`，彈出 Microsoft 登入視窗。
4.  **Token 交換**：使用者授權後，`launchWebAuthFlow` 的回呼會返回授權碼 (`code`)。`useAuth` 接著用此 `code` 和 `code_verifier` 向 Microsoft 的 `/token` 端點交換 `access_token` 和 `refresh_token`。
5.  **儲存 Token**：取得的 Tokens 被安全地儲存在 `chrome.storage.local` 的 `auth.ms` 鍵中。
6.  **Token 刷新**：`useAuth` Hook 會在 Token 即將過期時，自動使用 `refresh_token` 進行靜默刷新。若刷新失敗，則會清除認證狀態，要求使用者重新登入。

## 資料管理 (React Query + MS Graph)

- **資料來源**：所有待辦清單 (Task List) 和任務 (Task) 都來自 MS Graph API。本地不再儲存這些資料，僅快取。
- **Hooks**：`hooks/useMsTodos.ts` 提供了所有與資料互動的 Hooks (例如 `useMsTodoLists`, `useMsTasks`, `useCreateMsTask` 等)。
- **查詢鍵 (Query Keys)**：所有 Graph 相關的查詢鍵都定義在 `useMsTodos.ts` 的 `msq` 物件中，格式為 `["msgraph", "lists"]` 或 `["msgraph", "tasks", listId]`。
- **狀態更新**：所有建立、更新、刪除操作都透過 `useMutation` Hooks 進行。成功後，會自動使用 `queryClient.invalidateQueries` 來使相關的快取失效，觸發 UI 自動更新。

## 儲存鍵值 (`chrome.storage.local`)

- `auth.ms`: `AuthState` 物件，包含 `accessToken`, `refreshToken`, `expiresAt`。由 `useAuth.ts` 管理。
- `ms_account`: `MeProfile` 物件，包含登入使用者的基本資訊 (`id`, `displayName`, `upn`)。由 `background.ts` 在登入成功後寫入。
- `sidebarCollapsed`: 布林值，單純的 UI 狀態。

## 常見修改場景與指引

#### 1. 新增一個 Graph API 的權限 (Scope)

- **步驟 1**: 在 `package.json` 的 `manifest.oauth2.scopes` 陣列中新增權限。
- **步驟 2**: 在 `hooks/useAuth.ts` 的 `login` 和 `refreshAccessToken` 函式內的 `scope` 變數中同步新增該權限。
- **步驟 3**: 清除 `chrome.storage.local` 中的 `auth.ms`，讓使用者重新登入以獲取包含新權限的 Token。

#### 2. 擴充 `TodoTask` 型別 (例如需要 `priority` 欄位)

- **步驟 1**: 在 `hooks/useMsTodos.ts` 的 `TodoTask` 型別定義中，新增 `priority?: "low" | "normal" | "high"`。
- **步驟 2**: 在 `useCreateMsTask` 和 `useUpdateMsTask` 的 `patch` 物件中，允許傳入 `priority`。
- **步驟 3**: 在相關的 UI 元件 (例如 `TodoList.tsx`) 中，讀取並顯示 `priority` 資訊，或提供修改的介面。

#### 3. 呼叫一個新的 Graph API 端點

- **步驟 1**: 在 `lib/msgraph.ts` 中新增一個新的 `fetch` 函式 (如果需要特殊處理)。
- **步驟 2**: 在 `hooks/useMsTodos.ts` 中，建立一個新的 React Query Hook (`useQuery` 或 `useMutation`)。
    - 定義新的 Query Key。
    - 使用 `graphFetch` 函式並傳入 `token`。
    - 在 `mutation` 的 `onSuccess` 回呼中，記得要讓相關的 Query Keys 失效。

## 錯誤處理
- `hooks/useMsTodos.ts` 中的 `mutation` Hooks 已設定 `onError` 回呼，會使用 `emitToast` 顯示錯誤通知。
- `hooks/useAuth.ts` 中的認證錯誤會被 `console.error` 捕捉，並拋出異常，需要 UI 層來處理。

## 待辦清單 (可由 Agent 自動化)
- [ ] 針對 `useAuth` 和 `useMsTodos` 建立單元測試。
- [ ] 當 Token 刷新失敗時，除了清除認證外，應在 UI 上給予更明確的提示。
- [ ] 實現登出功能，並確保所有使用者相關的快取和儲存都被清除。
- [ ] 支援帳號切換。
- [ ] i18n 國際化。
