# UI 盤點：`/settings`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/settings/page.tsx`
> 頁面類型：重導向（redirect-only）

## 一句話用途
`/settings` 自身沒有畫面、收到請求後直接 `redirect('/settings/company')`（5/26 起個人設定改走側邊欄「扳手」dialog、settings 區只剩公司設定）。

## Layout 骨架
- **頁面框架**：無（server component、純 `redirect()`）
- **頁首**：無
- **分頁**：無

## UI 元素清單

> 此頁無任何 UI 元素。所有實際畫面都在 `/settings/company`（見 `settings__company.md`）。

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無 | — | — | — | — | — | — |

### 其他分類
全部 N/A（無 input / select / table / dialog / badge / icon / card）。

## 🔴 不統一 / 異常標記
- 無（redirect-only 頁）。

## 備註
- 導向目標 `/settings/company` 自身有 `settings.company.read` capability 守門、無權限者會被導到 unauthorized。
- `src/app/(main)/settings/` 下另有 `components/SettingsTabs.tsx`、`constants/labels.ts`、`hooks/useSettingsState.ts`、`types.ts`、`error.tsx`，但 `SettingsTabs` 只被 `/settings/company` 頁掛在 headerActions（見 company 檔），其餘為 leftover 工具檔。
