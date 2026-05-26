# UI 盤點：`/platform/aitoearn`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/platform/aitoearn/page.tsx`
> 頁面類型：外嵌（iframe-only）

## 一句話用途
把跑在 Vultr 的 AiToEarn（https://aitoearn.venturo.tw）以滿屏 iframe 嵌入 ERP，ERP / AiToEarn 各自登入（v1），看起來像「我家功能」。

## Layout 骨架
- **頁面框架**：無 wrapper、直接 return 一個 `<iframe>`
- **頁首**：無（2026-05-10 刻意拿掉 page-level header，避免與 ERP 全局 layout 重複）
- **分頁**：無
- iframe className：`flex-1 w-full border-0 -m-4 lg:-m-6`（用負 margin 抵外層 padding 滿屏）
- sandbox：`allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads`

## UI 元素清單

> 此頁僅一個 iframe、ERP 端不渲染任何自有 UI 元素（按鈕/表單/表格皆在 iframe 內、由 AiToEarn 自身控制、不在本盤點範圍）。

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無（ERP 端） | — | — | — | — | — | — |

### 其他分類
全部 N/A（ERP 端）。iframe 內 UI 不受 venturo design token 約束。

## 🔴 不統一 / 異常標記
- 無（ERP 端無自有 UI 元素可審）。
- ⚠️ 觀察（非 UI token 問題）：刻意「不顯示載入中 / 載入失敗狀態」（依賴瀏覽器自帶），若 AiToEarn 服務掛掉，使用者會看到瀏覽器原生白屏/錯誤頁、無 ERP 風格 fallback。屬產品決策、非設計違規。

## 備註
- URL 來源：`NEXT_PUBLIC_AITOEARN_URL` → fallback `https://aitoearn.venturo.tw`。
- v2（Phase 4）規劃補 SSO + API 整合、屆時考慮收緊 sandbox（移除 allow-same-origin 改 postMessage）。
- 此頁無法被 design token 統一，因內容是外部站；ERP 殼層唯一可調的是 iframe 容器與 fallback 處理。
