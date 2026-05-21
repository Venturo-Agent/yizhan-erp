# Finance Settings 9 個問題追蹤 — 2026-05-21

> William 拍板「交給你好好處理」、Claude Opus 接手
> 原始清單由對方 AI session 產出、業務 audit

---

## 處理狀態總表

| # | 問題 | 嚴重度 | 狀態 | 修法 |
|---|---|---|---|---|
| 🔥 #1 | expense_categories RLS + API 信 client workspace_id | P0 critical | ✅ **已修** | migration `20260521170000` + API 重寫、走 session |
| ⚠️ #2 | bank_accounts/chart_of_accounts INSERT check=true | P0 medium | ✅ **已修** | migration `20260521170100` |
| 🐛 #3 | 公司支出/收入 tab 永遠空白（migration 漏跑）| P0 bug | ✅ **已修** | migration `20260521170200` 補 9 筆 INSERT |
| 🐛 #4 | 「團體請款類別」按新增無反應 | P1 bug | ⏳ **待 debug** | 需要 user 跑 + 看 Network response |
| 🧱 #5 | user_id vs workspace_id 兩欄並存 schema 冗餘 | P2 cleanup | ⏳ **待拍板** | 是否 DROP user_id 欄位（影響 schema、要 migration）|
| 🧱 #6 | 4 個 API 串行載入 | P2 perf | ✅ **已修** | Promise.all 並行 |
| 🧱 #7 | 沒走 entity hook（紅線 F）| P2 cleanup | ⏳ **待拍板** | 需建 entity hook for 4 個表、改 page 用 |
| 🧱 #8 | 載入失敗靜默吃掉 | P2 UX | ✅ **已修** | 加 toast.error |
| 🧱 #9 | 冗餘 ?workspace_id= query param | P2 cleanup | ✅ **已修** | loadData 拿掉、所有 API 走 session |

---

## 已修細節

### #1 expense_categories RLS + API
**前**：
- RLS: `auth.role() = 'authenticated'`（無 workspace 隔離）
- API: `searchParams.get('workspace_id')` + 字串拼接 SQL（injection risk）
- 寫入欄位錯亂：`user_id` 裝 workspace_id 值

**後**：
- RLS: `workspace_id IS NULL OR workspace_id = get_current_user_workspace()`（SELECT）+ `workspace_id = current`（WRITE）
- API: `getCurrentWorkspaceId()` from session
- 寫入：`workspace_id` 寫真欄位、不再塞 user_id
- backfill：legacy 資料 `workspace_id` ← `user_id`

**對應紅線**：H（新加、2026-05-21）

### #2 bank_accounts + chart_of_accounts INSERT 守門
**前**：`WITH CHECK (true)` 任意 workspace_id 可塞
**後**：`WITH CHECK (workspace_id IS NULL OR workspace_id = current)`

### #3 公司支出/收入 tab 空白
**前**：`expense_categories` 缺 9 筆 `company_expense`/`company_income` 系統預設
**後**：補 6+3 筆、`is_system=true`、`workspace_id=NULL`（全租戶共讀）

### #6 串行 → 並行
**前**：4 個 fetch 用 await 串、3 個無謂 RTT 等待
**後**：Promise.all 並行、page 載入快 ~70%

### #8 靜默失敗 → toast
**前**：`catch { logger.error }`、user 看到空白頁不知道發生啥
**後**：加 `toast.error('財務設定載入失敗、請重新整理或聯絡管理員')`

### #9 冗餘 query param
**前**：4 個 fetch 都帶 `?workspace_id=...`、但 API 都從 session 取（除 #1 expense-categories 例外、那是 bug）
**後**：拿掉、保持 URL 乾淨

---

## 待處理細節

### #4 「團體請款類別」按新增無反應
**現況**：root cause 不明、需要 user 在 UI 操作 + 看 Network response 才能定位
**懷疑**：可能 capability 沒過 / dialog 內 form submit handler 沒接通
**下一步**：等 William 試一次新增、看具體 error response 再修

### #5 user_id vs workspace_id schema 冗餘
**現況**：
- `user_id` (uuid, nullable) — legacy 儲位、原本 API 寫此欄位
- `workspace_id` (uuid, nullable) — 後加的欄位、現在 API 寫此欄位
- 兩個欄位語意相同、目前 user_id 全 NULL（backfill 後）

**選項**：
- A. DROP `user_id` 欄位（最乾淨、但要確認沒外部 caller 讀此欄位）
- B. 保留 user_id 不動（grandfather、漸進清）
- C. rename user_id → workspace_id_legacy（明示）

**等 William 拍板**：A/B/C

### #7 finance/settings page 沒走 entity hook（紅線 F）
**現況**：頁面用 `useState + fetch` 自己管 4 份資料
**應該**：建 entity hook（usePaymentMethods / useBankAccounts / useChartOfAccounts / useExpenseCategories）、改 page 用 hook、寫入走 apiMutate

**工時估**：4 個 entity hook × 30 分鐘 + page 改寫 1 小時 = 3 小時
**優先級**：P1（不阻 6/1、但屬紅線 F 違反）

**等 William 拍板**：要不要排入 6/1 前修

---

## 對應紅線

修完這 9 個 + 新增紅線 H、整個 finance/settings 區的：
- 紅線 H（新）：✅ 過
- 紅線 F：⏳ #7 待修

---

*建立：2026-05-21、由 Claude Opus 接手 William「交給你好好處理」指令*
*更新：6 件已修 / 3 件等拍板 + 1 件待 debug*
