# UI 盤點：`/documents`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/documents/page.tsx` → `_components/DocumentsPage.tsx`
> 頁面類型：佔位頁（placeholder / 建置中）

## 一句話用途
文件中心 — 目前是空殼佔位頁，只顯示「文件功能建置中...」，尚無實際功能。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=「文件中心」、icon=FileText）
- **頁首**：ContentPageLayout 標準標題列（無 primaryAction、無 tabs、無麵包屑）
- **分頁**：無
- **內容**：單一 `<div className="p-4 text-muted-foreground">文件功能建置中...</div>`

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無 | — | — | — | — | — | — |

### ⌨️ 輸入框 / 🔽 下拉 / ☑️ 勾選 / 📋 表格 / 🪟 對話框 / 🏷️ Badge / 🃏 卡片 / 🔔 回饋
全部 N/A（佔位頁無任何互動元素）。

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 header icon | FileText | (ContentPageLayout 內部) | — |

## 🔴 不統一 / 異常標記
- 🟡 佔位文字用 `text-muted-foreground`（shadcn 預設語意 token），非 venturo `morandi-*`/`status-*`，但屬建置中佔位、影響極小。
- 無實質 UI 可審（功能未開發）。

## 備註
- 此頁僅 13 行，純佔位。`documents` feature 在租戶詳情「其他可選功能」可開關，但實際頁面尚未建。
- 未來補功能時需整套走 5 SSOT + 6 層架構（目前路由存在但內容空）。
