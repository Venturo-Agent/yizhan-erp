# Mobile App 待決策清單 — 2026-05-21

> 自動產出（Claude Opus、夜間檢查到 /app namespace 新增）
> 性質：**我不可控、需要 William 拍板**才能繼續

---

## 背景

2026-05-21 commit `77f63c0` 新增 `src/app/app/` namespace（mobile app 殼）。
我已自動修可控的：
- ✅ 加 useRequireAppAuth hook（dashboard/orders/calendar/more 都接、未登入 redirect）
- ✅ 拿掉 dashboard 死連結（/app/todos / /app/messages）
- ✅ 補 /app/settings placeholder（more 連的 3 個 menu item 不再 404）
- ✅ type-check + check-standards 全綠

---

## 不可控、等 William 拍板的事

### 決策 #1：/app/* 要連哪些 entity hooks？

**現況**：
- /app/dashboard：只有 quickActions（寫死 array、未讀 ERP 資料）
- /app/orders：純 UI shell、未接 entity
- /app/calendar：純 UI shell、未接 entity
- /app/more：menu 寫死、未接 entity

**選項**：
- A. 全接（dashboard 顯示真實訂單 / 行事曆 / 待辦）— 工時 2-3 天
- B. 先補核心（/app/orders → useOrdersSlim、/app/calendar → useCalendarEvents）— 工時 1 天
- C. 等 mobile app spec 出來再接 — 推延

### 決策 #2：mobile app 要進 ALL_MODULES 嗎？

**問題**：
- mobile app 是 web ERP 的 mobile 版、不是新 module
- 但 5 維度健檢矩陣 + audit 工具都吃 ALL_MODULES
- 不進 → 健檢框架看不到 mobile app
- 進 → 模糊「module」概念

**選項**：
- A. 不進、healt check 框架只管 web、mobile 走 PWA 自己一套 audit
- B. 進、當作 `mobile_app` module
- C. 加新 dimension「is_mobile」label、現有 module 同時評 web + mobile

### 決策 #3：/app/todos / /app/messages 要做嗎？

**現況**：
- dashboard quickActions 原本有這 2 個、我已暫拿掉
- 完整 mobile app 邏輯上該有「待辦事項」「訊息中心」

**選項**：
- A. 補（讓 mobile app 跟 web 功能對齊）— 工時 2-3 天 / 個
- B. 不補（mobile 只做「最常用 4 功能」、其他走 webview / 跳 web）

### 決策 #4：/app/settings 要做什麼具體 content？

**現況**：
- /app/more 有 3 個 menu 連 /app/settings（通知設定 / 隱私安全 / 幫助中心）
- 我補了 placeholder「即將推出」
- 內容沒設計

**選項**：
- A. 3 個分開做（通知設定 = push 設定、隱私 = 帳號 / 資料權限、幫助 = FAQ）
- B. 1 個 page 含 3 個 section
- C. 「設定」整合進 webview / 跳 web 設定頁

### 決策 #5：mobile app 是 PWA 還是 React Native？

**現況**：
- public/app-manifest.json 存在（PWA 設定）
- src/app/app/layout.tsx 用 Next.js layout（Web）
- workspace/venturo_app/ 有 Flutter 結構（pubspec.yaml + lib/）— 另一個方向？

**選項**：
- A. PWA 為主（現在路徑）、Flutter 凍住
- B. Flutter app 為主、廢 /app namespace
- C. 雙軌（PWA 給 web 使用者快速 install、Flutter 給 App Store / Play）

---

## 不影響當前 deploy

以上 5 個決策都是「未來 mobile app 完整版」需要的、目前 dashboard / orders / calendar / more 都是 placeholder shell。

**6/1 第一付費客戶**：
- 如果客戶在 PC web 用、mobile app placeholder 不影響
- 如果客戶在手機用、shell 也能登入 + 看見「即將推出」、不會 404

---

## 我下一步建議

1. **6/1 前不動**（focus on web 6/1 ready）
2. **6/1 後**：William 拍板 5 個決策後我接 Phase 1（最痛的 #1 + #2）

---

*建立：2026-05-21、由 Claude Opus 夜間 detect mobile app 新增後產出*
*更新：當 William 拍板任一決策、移該段到 decided/*
