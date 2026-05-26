# UI 盤點：`/`（網站根）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/page.tsx`
> 頁面類型：純 redirect（N/A）

## 一句話用途
網站根路徑、進來立刻轉址到 `/dashboard`、本身沒有任何 UI。

## Layout 骨架
- **頁面框架**：N/A — 全檔只有 5 行、`redirect('/dashboard')`、不 render 任何元素
- **頁首**：N/A
- **分頁**：N/A

## UI 元素清單
全部 N/A（無 JSX、無任何 import UI 組件）。

### 🔘 按鈕 Buttons
N/A

### ⌨️ 輸入框 Input / Textarea
N/A

### 🔽 下拉 / 選擇
N/A

### ☑️ 勾選 / 開關
N/A

### 📋 表格 / 列表
N/A

### 🪟 對話框
N/A

### 🏷️ 狀態標籤
N/A

### 🎨 圖示
N/A

### 🃏 卡片 / 容器
N/A

### 🔔 回饋 / 空狀態 / 載入
N/A

## 🔴 不統一 / 異常標記
- 無。純 server redirect、不涉及 UI。

## 備註
- 完整內容：`import { redirect } from 'next/navigation'; export default function RootPage() { redirect('/dashboard') }`
- 導向目標：`/dashboard`（已登入者進儀表板；未登入由 middleware 在 /dashboard 前攔截轉 /login）。
- 行銷首頁是獨立的 `/landing`（見 landing.md）、不是根路徑。
