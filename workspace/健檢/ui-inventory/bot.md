# UI 盤點：`/bot`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/bot/page.tsx`
> 頁面類型：`redirect 殘骸（已遷移）`

## 一句話用途
原本是 LINE Bot 對話列表頁、5/14 William 拍板整合進 AI Hub、現在這頁只剩一行 `redirect('/ai?tab=conversations')`、不再渲染任何 UI。

## Layout 骨架
- **頁面框架**：無（純 server function、`export default function BotRedirectPage() { redirect(...) }`）
- **頁首**：無
- **分頁**：無

## UI 元素清單

此頁**沒有任何 UI 元素**——整檔只有 15 行、body 唯一動作是 `redirect('/ai?tab=conversations')`。真正的對話列表 UI 已搬到 `/ai`（AI Hub 對話管理 tab）、由 `/api/messaging/conversations` 餵資料。

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| （無） | — | — | — | — | — | — |

### ⌨️ 輸入框 / 🔽 下拉 / ☑️ 勾選 / 📋 表格 / 🪟 對話框 / 🏷️ Badge / 🎨 圖示 / 🃏 卡片 / 🔔 回饋
全部「無」——此頁不渲染任何元素。

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🟡 **非 UI 問題**：此頁是 redirect 殘骸、UI 已全數遷移到 `/ai`。盤點 bot module UI 時、實際元素要看 `/ai` 的 conversations tab、不在本頁。
- 鐵律 #8 保留檔案、Phase 4 才清 `_components` dead code。

## 備註
- 真正的對話列表 UI 在 `/ai`（AI Hub 對話管理 tab）、本盤點任務範圍只到 `/bot/*` 殼層。
- 若要盤點實際對話列表 UI、需另派專員掃 `src/app/(main)/ai/`。
