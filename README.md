# MMS TODO（Chrome 擴充功能）

一個簡潔的待辦清單 Chrome 擴充功能。支援類別管理、在 Popup 及 Side Panel 中操作待辦、以及簡單的設定頁。資料儲存在 `chrome.storage.local`，離線可用。

> 本專案使用 Plasmo 搭建，採用 React 18 + TypeScript + Tailwind + Radix/shadcn 風格 UI，並以 TanStack React Query 管理資料快取。

## 功能特色
- Popup、Side Panel、Options 三種介面
- 類別管理：新增、重新命名、刪除（預設 `工作` 類別不可刪）
- 待辦管理：新增、完成/取消完成、刪除
- 以 `chrome.storage.local` 持久化，無需後端
- React Query 快取與自動重新整理
- Tailwind + shadcn 風格的現代 UI

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
- 打開 chrome://extensions
- 啟用「開發人員模式」
- 以「載入未封裝項目」選擇資料夾：`build/chrome-mv3-dev`

4) 開發中可直接修改以下檔案，Plasmo 會自動重建：
- `popup.tsx`（彈出視窗）
- `sidepanel.tsx`（側邊面板）
- `options.tsx`（設定頁）

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

- `popup.tsx`：Popup 入口（選類別、新增與檢視任務，並可打開 Side Panel）
- `sidepanel.tsx`：Side Panel 入口（左側類別，右側待辦）
- `options.tsx`：Options 設定頁（示範儲存 `settings.username`）
- `providers.tsx`：React Query Provider 與全域 client 設定
- `hooks/useTodos.ts`：待辦與類別的查詢/新增/更新/刪除；資料來源為 `chrome.storage.local`
- `ui/TodoList.tsx`：待辦清單 UI 與互動邏輯
- `components/sidepanel/app-sidebar.tsx`：側邊欄（類別清單與操作）
- `components/ui/*`：基礎 UI 元件（button、input、checkbox、tooltip、sidebar…）
- `types/todo.ts`：`Category` 與 `Todo` 型別
- `styles/globals.css`：Tailwind 變數與主題

## 重要設定

- `package.json` scripts：
  - `dev`：plasmo dev
  - `build`：plasmo build
  - `package`：plasmo package

- `tailwind.config.js`：掃描 `components`, `ui`, `hooks`, `lib` 與三個入口 (`popup|options|sidepanel`)。

- MV3 權限（由 Plasmo 生成 manifest）：
  - `storage`
  - `host_permissions: ["https://*/*"]`
  - `action.default_popup = popup.html`
  - `side_panel.default_path = sidepanel.html`
  - `options_ui.page = options.html`

## 資料模型與儲存鍵

- Category：`{ id, name, color?, createdAt }`
- Todo：`{ id, title, completed, categoryId, createdAt }`
- 預設類別：首次啟動若無類別，會建立 `{ id: "work", name: "工作" }`
- chrome.storage.local：
  - `categories: Category[]`
  - `todos: Todo[]`
  - `settings: { username }`
  - `sidebarCollapsed: boolean`

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

---

進階維護與擴充請參考 `AGENT.md`。
