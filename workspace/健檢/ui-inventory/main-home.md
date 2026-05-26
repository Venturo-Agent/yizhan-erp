# UI 盤點：`/`（main 首頁）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/page.tsx`
> 頁面類型：儀表板（= dashboard 的 alias）

## 一句話用途
員工進系統的根路徑首頁。本身無自有 UI、直接 render 與 `/dashboard` 完全相同的 `DashboardClient`。

## Layout 骨架
- **頁面框架**：N/A — `page.tsx` 僅一行 `return <DashboardClient />`，無自有 layout。
- 實際 UI 全部來自 `DashboardClient`。

## 結論：本頁 = `/dashboard` 的 alias

```tsx
// src/app/(main)/page.tsx 全文
import { DashboardClient } from '@/app/(main)/dashboard/_components/DashboardClient'
export default function Home() {
  return <DashboardClient />
}
```

`/dashboard/page.tsx` 同樣 `return <DashboardClient />`。兩頁 render 的是**同一個 component**、UI 元素 100% 相同。

## UI 元素清單
**全部 N/A（無自有元素）** — 完整盤點見 `dashboard.md`。

## 🔴 不統一 / 異常標記
- 無本頁自有問題。所有發現歸到 `dashboard.md`。
- 唯一可記事項：`/` 與 `/dashboard` 兩個路由 render 同一畫面（不是 redirect、是直接複用同一 client component）。屬刻意設計（根路徑落地即首頁）、非異常。

## 備註
- 詳細 UI 盤點請看同目錄 `dashboard.md`。
- import 路徑用絕對 alias `@/app/(main)/dashboard/...`，`/dashboard/page.tsx` 用相對 `./_components/...`，兩者指向同檔、僅寫法不同（無功能差異）。
