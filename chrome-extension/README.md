# mms-todo（Chrome 擴充功能）

一個簡潔的 Microsoft To Do Chrome 擴充功能。透過 Microsoft Graph API 同步待辦事項，支援在 Popup 及 Side Panel 中操作。

> 本專案使用 Plasmo 搭建，採用 React 18 + TypeScript + Tailwind + Radix/shadcn 風格 UI，並以 TanStack React Query 管理資料快取。

## 功能特色
- Popup、Side Panel、Options 三種介面
- 透過 Microsoft Graph API 同步 Microsoft To Do 待辦事項
- Microsoft 帳戶登入驗證（OAuth 2.0）
- 待辦清單管理：檢視、切換清單
- 待辦管理：新增、完成/取消完成、刪除
- React Query 快取與自動重新整理
- Tailwind + shadcn 風格的現代 UI
- 多語系支援（繁體中文、英文）

## 快速開始

1) 安裝依賴

```bash
pnpm i
```

2) 啟動開發模式

```bash
pnpm dev
```

3) 在 Chrome 載入擴充功能（開發版）

4) 開發中可直接修改以下檔案，Plasmo 會自動重建：


## Motion Effects

本專案使用 Framer Motion 提供流暢的 UI 動畫：

- 待辦項目新增/移除時的淡入淡出與滑動效果
- 完成切換時的縮放與刪除線過渡效果

實現位置：

- `ui/TodoList.tsx`：使用 `AnimatePresence` 和 `motion.li` 處理清單項目動畫
## 建置與封裝

- 建置生產版：
```bash
pnpm build
```
產出目錄：`build/chrome-mv3-prod`

- 產生商店可上傳 zip：
```bash
pnpm package
```
輸出檔：`build/chrome-mv3-prod.zip`

## 專案結構

- `popup.tsx`：Popup 入口（選清單、新增與檢視任務，並可打開 Side Panel）
- `sidepanel.tsx`：Side Panel 入口（左側清單，右側待辦）
- `options.tsx`：Options 設定頁
- `background.ts`：背景服務（Token 刷新、通知、訊息轉發）
- `providers.tsx`：React Query Provider 與全域 client 設定
- `hooks/useAuth.ts`：Microsoft OAuth 驗證 Hook
- `hooks/useMsTodos.ts`：Microsoft Graph To Do API Hook
- `hooks/useSettings.ts`：設定管理 Hook
- `ui/TodoList.tsx`：待辦清單 UI 與互動邏輯
- `components/sidepanel/app-sidebar.tsx`：側邊欄（清單列表與操作）
- `components/ui/*`：基礎 UI 元件（button、input、checkbox、tooltip、sidebar…）
- `components/ui/auth-gate.tsx`：統一驗證元件
- `lib/msgraph.ts`：Microsoft Graph API 封裝
- `lib/i18n.ts`：多語系支援
- `types/todo.ts`：`TodoList` 與 `TodoTask` 型別
- `styles/globals.css`：Tailwind 變數與主題

## 重要設定

- `package.json` scripts：
  - `dev`：plasmo dev
  - `build`：plasmo build
  - `package`：plasmo package

- `tailwind.config.js`：掃描 `components`, `ui`, `hooks`, `lib` 與三個入口 (`popup|options|sidepanel`)。

- MV3 權限（由 Plasmo 生成 manifest）：
  - `identity`：Microsoft OAuth 驗證
  - `storage`：本地資料快取
  - `notifications`：登入成功通知
  - `sidePanel`：Side Panel 功能
  - `host_permissions`：Microsoft Graph API 與登入端點

## 資料來源

本擴充功能透過 Microsoft Graph API 存取 Microsoft To Do 資料：
- 待辦清單（Task Lists）
- 待辦任務（Tasks）

需要 Microsoft 帳戶登入授權。

## 發佈到商店（CI）

- GitHub Actions：`.github/workflows/submit.yml` 已設定以 `PlasmoHQ/bpp@v3` 自動提交。
- 你需要在 repo secrets 建立 `SUBMIT_KEYS`。
- 首次需手動上傳一版設定憑證，後續即可用 CI 自動化。

## 疑難排解

- 開發模式下看不到樣式？
  - 確認 `tailwind.config.js` content 路徑包含已修改的檔案。
  - 確認入口有 `import "./styles/globals.css"`。

- Popup/Side Panel 無法寫入資料？
  - 確認已授予 `storage` 權限（開發版載入時 manifest 已含）。
  - 開啟 DevTools（擴充頁面）查看 console 是否有錯誤。

- Side Panel 開啟失敗？
  - 僅在有作用中的分頁時可呼叫 `chrome.sidePanel.open({ tabId })`。

## 版權與授權

僅供學習與展示用途。如需商用請自行評估與調整授權。

## Auth 統一驗證元件（AuthGate）

為了統一管理登入/驗證流程與提示畫面，已新增 `components/ui/auth-gate.tsx` 元件，並已套用到 `popup.tsx` 與 `sidepanel.tsx`。

- 功能：
  - 自動顯示三種狀態畫面：載入中、刷新 Token 中、未登入（附登入按鈕）
  - 已登入時，直接渲染子內容（children）
  - 可傳入既有的 `useAuth()` 物件，避免重複呼叫

- 基本用法：
  ```tsx
  import AuthGate from "./components/ui/auth-gate"
  import { useAuth } from "./hooks/useAuth"

  function MyPage() {
    const auth = useAuth()
    return (
      <AuthGate auth={auth}>
        {/* 已登入才會看到的內容 */}
        <MainApp />
      </AuthGate>
    )
  }
  ```

- 備註：
  - 如未傳入 `auth`，`AuthGate` 會自行呼叫 `useAuth()`。
  - 可用 `size="sm"` 顯示較緊湊的登入提示畫面，或用 `loginTitle` 自訂文案。
