# UI 盤點：`/messaging`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/messaging/page.tsx`
> 頁面類型：純轉址（redirect、無 UI）

## 一句話用途
舊的「多通路收件匣」入口、5/14 William 拍板整合進 AI Hub；此頁只做 `redirect('/ai?tab=conversations')`、自身沒有任何 UI。

## Layout 骨架
- **頁面框架**：無。整支檔案就是一個 server component 呼叫 `redirect('/ai?tab=conversations')`
- **頁首**：無
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| （無 UI） | — | — | — | — | — | — |

### ⌨️ 輸入框 / 🔽 下拉 / ☑️ 開關 / 📋 表格 / 🪟 對話框 / 🏷️ Badge / 🎨 Icons / 🃏 卡片 / 🔔 回饋
- 全部「無」— 此頁不 render 任何元素、進來立即跳 `/ai?tab=conversations`

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 無 UI、無可盤點項
- 註記：原 410 行收件匣 UI 已遷至 `src/app/(main)/ai/_components/AiConversationsTab.tsx`（見 `ai.md`）
- 鐵律 #8：檔案刻意保留不刪、`messaging_inbox` feature/capability 向後相容暫不 deprecate（Phase 4 才處理）
- 轉址目標 `?tab=conversations`、但 `/ai` 現行 search param 是 `?conv=<id>`（`tab` 已非現役 param、AiConversationsTab 用 `conv`）→ 轉址帶的 `tab=conversations` 實際無作用、只是進 AI Hub 預設畫面。**待確認**是否該更新轉址字串（非 UI 問題、屬死參數殘留）

## 備註
- 真正的 UI 盤點全在 `ai.md`（AI Hub 對話介面）
