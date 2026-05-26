# UI 盤點：`/view/[id]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/view/[id]/page.tsx` + `client.tsx`（+ `loading.tsx` / `error.tsx`）
> 頁面類型：公開頁（對客分享 — 行程表檢視）

## 一句話用途
讓客戶不用登入、直接用分享連結查看某行程表（itinerary）。server 端產 OG metadata（給 LINE/FB 預覽）、client 端抓 `/api/itineraries/[id]` 後交給 `TourPage` 渲染。

## Layout 骨架
- **頁面框架**：薄殼委派 — `page.tsx`（server）只做 metadata + render `<PublicViewClient>`；`client.tsx` 抓資料後 render `<TourPage data={...} isPreview={false} viewMode={...} />`
- **頁首**：本頁不畫頁首；實際畫面（行程表）由 `@/components/tour-display/TourPage` 負責（**屬獨立 tour-display 設計域、本次盤點不展開**）
- **分頁**：N/A
- **client component**：client.tsx 是（`'use client'`、抓 API + 偵測螢幕寬切 desktop/mobile）
- **響應式**：`window.innerWidth < 768` 自動切 `viewMode` mobile/desktop

## UI 元素清單

> 本頁自身只有「載入 / 錯誤 / 找不到」三個狀態畫面；正常內容全委派給 `TourPage`（另列設計域、此處不盤）。

### 🔘 按鈕 Buttons
N/A（本頁無按鈕；error.tsx 的 reset 鈕由 `ModuleError` 組件提供）

### ⌨️ 輸入框 / 🔽 下拉 / ☑️ 勾選 / 📋 表格 / 🪟 對話框
N/A（本頁殼層無；視 TourPage 內容而定、不在本次範圍）

### 🏷️ 狀態標籤
N/A

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 錯誤態驚嘆號 | 純文字「!」（非 lucide） | `text-2xl` | 容器 `bg-status-danger-bg` | 

🟡 錯誤態用純文字 `!` 放在 `bg-status-danger-bg` 圓底、未用 lucide 的 AlertCircle/AlertTriangle（跟認證頁的錯誤圖示風格不一）。

### 🃏 卡片 / 容器
N/A（殼層只有置中文字塊）

### 🔔 回饋 / 空狀態 / 載入 Loading
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入態（fetch 中） | `<ModuleLoading fullscreen className="bg-morandi-background" />` | ✅ 走共用 ModuleLoading |
| route-level loading.tsx | `<ModuleLoading />` | ✅ 共用 |
| route-level error.tsx | `<ModuleError moduleName="View" />` | ✅ 走共用 ModuleError |
| 錯誤態（API 失敗） | 自刻置中區塊（圓底 `!` + 標題 + 訊息）| 🟡 自刻、未用共用 ModuleError |
| 找不到（!data） | 自刻置中純文字 | 🟡 自刻空狀態 |

文案走 i18n：`useTranslations('publicPage')`（errorTitle / errorLoadFailed / errorNotFound 等）— ✅ 文案中央化。

## 🔴 不統一 / 異常標記（重點）
- **三種錯誤/空狀態畫面分散三處**：route 級 `error.tsx` 走共用 `ModuleError`、但 client.tsx 內的「API 失敗」與「找不到」是各自手刻置中區塊、未統一走 ModuleError → 同一頁三種失敗畫面、兩種風格。
- **錯誤圖示用純文字 `!`**：client.tsx 錯誤態用 `<span className="text-2xl">!</span>` 套在 `bg-status-danger-bg` 圓底、非 lucide 圖示。
- **`bg-morandi-background` class**：load 態傳 `className="bg-morandi-background"`、需確認此 token 存在（tokens.css 主要是 `bg-background`；`morandi-background` 若未定義會無背景色）→ **待確認 token 名**。
- 本頁殼層**無 Tailwind 預設色**、顏色走 morandi/status token、OK。

## 備註
- 真正的 UI 主體在 `@/components/tour-display/TourPage`（對客行程表展示組件、含桌機/手機兩版式）、**屬獨立 tour-display 設計域**、不在本次根層雜項頁範圍 → **待拍板是否納入統一**（建議單獨盤 tour-display 組件群）。
- server `generateMetadata` 動態抓 itineraries 標題/封面做 OG 預覽、設計合理。
- 定性：本頁是**薄殼委派頁**、自身 UI 元素極少；可改善點是把 client.tsx 兩個手刻失敗態收斂到共用 ModuleError。
