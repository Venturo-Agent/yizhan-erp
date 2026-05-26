# UI 盤點：`/platform`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/platform/page.tsx`
> 頁面類型：重導向（redirect-only）

## 一句話用途
`/platform` 入口頁本身沒畫面、直接 `redirect('/platform/aitoearn')`（第一個平台整合）。註解說明：之後加新整合（xhs / capture-bot）時改成 landing 頁列所有整合。

## Layout 骨架
- **頁面框架**：無（server component、純 `redirect()`）
- **頁首**：無
- **分頁**：無

## UI 元素清單

> 此頁無任何 UI 元素。實際畫面在 `/platform/aitoearn`（見 `platform__aitoearn.md`）。

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無 | — | — | — | — | — | — |

### 其他分類
全部 N/A。

## 🔴 不統一 / 異常標記
- 無（redirect-only 頁）。

## 備註
- 守門：`/platform/aitoearn` 走 `workspace_features('platform_integrations')` + `role_capabilities`（一般 feature 模式）。
- 未來多整合時此頁應改為 landing 列表（目前 hardcode 導向單一整合）。
