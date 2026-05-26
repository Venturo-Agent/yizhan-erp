# UI 盤點：`/bot/instagram-setup`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/bot/instagram-setup/page.tsx`
> 頁面類型：`redirect 殘骸（已遷移）`

## 一句話用途
原本是 Instagram DM Bot 串接設定精靈、5/14 整合進 AI Hub、現在只剩 `redirect('/ai?tab=setup&channel=instagram')`、不渲染任何 UI。真正的 IG 設定精靈已搬到 `src/app/(main)/ai/_components/setup/InstagramSetup.tsx`。

## Layout 骨架
- **頁面框架**：無（純 server function、唯一動作 redirect）
- **頁首**：無
- **分頁**：無

## UI 元素清單

此頁**沒有任何 UI 元素**——整檔 13 行、唯一動作 `redirect('/ai?tab=setup&channel=instagram')`。

### 🔘 按鈕 / ⌨️ 輸入 / 🔽 下拉 / ☑️ 勾選 / 📋 表格 / 🪟 對話框 / 🏷️ Badge / 🎨 圖示 / 🃏 卡片 / 🔔 回饋
全部「無」。

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🟡 **非 UI 問題**：redirect 殘骸、實際 IG setup wizard UI 在 `src/app/(main)/ai/_components/setup/InstagramSetup.tsx`、要盤點需掃該檔。IG 品牌色（粉色）若出現在該檔屬合法識別色。

## 備註
- 鐵律 #8 保留檔案、不 rm。
- 真正的 IG setup UI 在 `/ai?tab=setup&channel=instagram`、本盤點任務範圍只到 `/bot/*` 殼層。
