# mms-todo

![mms-todo Banner](./shared/banner-1200x630.jpg)

一個完整的待辦清單解決方案，包含 Chrome 擴充功能和介紹網站。

## 📋 專案概述

mms-todo 是一個現代化的待辦清單管理工具，提供兩種使用方式：

- **Chrome 擴充功能**：輕量級的瀏覽器擴充功能，支援 Popup、Side Panel 和 Options 頁面
- **介紹網站**：現代化的網頁介紹，展示擴充功能特色和下載連結

## 🏗️ 專案結構

```
mms-todo/
├── chrome-extension/     # Chrome 擴充功能原始碼
├── web/                  # 介紹網站原始碼
├── shared/               # 共用資源（圖片、圖標等）
├── .github/              # GitHub Actions 工作流程
└── .gitignore           # Git 忽略規則
```

## 🚀 快速開始

### Chrome 擴充功能開發

```bash
cd chrome-extension
pnpm install
pnpm dev
```

### 網站開發

```bash
cd web
npm install
npm run dev
```

## 📦 建置與部署

### Chrome 擴充功能

```bash
cd chrome-extension
pnpm build          # 建置生產版
pnpm package        # 產生商店上傳 ZIP
```

### 網站部署

```bash
cd web
npm run deploy      # 部署到 Cloudflare Pages
```

## 🛠️ 技術棧

### Chrome 擴充功能
- **框架**: Plasmo (Chrome Extension Framework)
- **前端**: React 18 + TypeScript
- **樣式**: Tailwind CSS + shadcn/ui
- **狀態管理**: TanStack React Query
- **動畫**: Framer Motion
- **儲存**: Chrome Storage API

### 介紹網站
- **框架**: Hono (Cloudflare Workers)
- **建置工具**: Vite
- **部署**: Cloudflare Pages
- **樣式**: 自訂 CSS + 現代設計

## 📖 詳細說明

- [Chrome 擴充功能說明](./chrome-extension/README.md)
- [網站開發說明](./web/README.md)
- [專案代理文件](./chrome-extension/AGENT.md)

## 🎯 主要功能

- ✅ 類別化待辦管理
- ✅ Popup、Side Panel、Options 三種介面
- ✅ 本地儲存，離線可用
- ✅ 現代化 UI 設計
- ✅ 流暢的動畫效果
- ✅ 響應式設計

## 📄 授權

僅供學習與展示用途。如需商用請自行評估與調整授權。

---

**安裝 Chrome 擴充功能**: [Chrome Web Store](https://chromewebstore.google.com/detail/bmmgffjkialoohecnglopijlaedbpfig) 

**訪問介紹網站**: [mms-todo 官網](https://mms-todo.wiz.tw) 