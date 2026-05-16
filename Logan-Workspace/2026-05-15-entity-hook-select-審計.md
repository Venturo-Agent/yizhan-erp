---
title: Entity Hook Select 全面審計
created: 2026-05-15
owner: Max
trigger: William 看到 advanced_by 在 refresh 後消失、追到 idb cache 卡舊、要全面檢查還有哪裡卡
status: 審計完成（code 未動、等拍板）
priority: high
---

# Entity Hook Select 審計報告

## 背景

`createEntityHook` 用 SWR + IndexedDB 持久 cache、`staleTime: Infinity` + `dedupe: true`、靠 Realtime 推播刷新。
副作用：entity hook 的 `list.select` 字串改動後、idb cache key 不變、舊 cache 永久卡 stale。

**剛修**：cacheKey 加 select hash、改 select → key 變 → 強制 re-fetch（`createEntityHook.ts` 166 行）。

**還要修**：35 個 entity hook 的 select 跟 DB 真實 schema 對齊度。

## 審計方法

1. grep 每個 entity hook 的 `list.select` 字串
2. SQL 撈每張表的 `column_name`
3. 交叉比對找差異：
   - 🚨 select 有 / DB 沒有 → query 會 400 失敗
   - ⚠️ DB 有 / select 漏 → UI 拿 undefined、新功能載不到
   - 🟢 軟刪 / 後端欄漏 → 無感、可選

## 🚨 嚴重（query 會壞 / 核心業務卡）

| 表 | 問題 | 影響 |
|---|---|---|
| **workspaces** | select 寫 `type` 但 DB 5/14 已砍 | query 400、整套 workspaces 列表壞、idb stale 蓋住 |
| **disbursement_orders** | 漏 `payment_method_id` / `total_fee` | 編輯出納單載不到付款方式 / 手續費（剛改的 wizard 編輯模式會空白） |
| **employees** | 漏 `bank_code` / `bank_name` / `bank_account_number` / `bank_account_name`（5/15 加） + `role_id` + `branch_id` + `department_id` + `is_dept_manager` + `personal_info` + `job_info` + `salary_info` | **代墊人銀行載不到**（剛修才連到這條鏈）+ HR 編輯員工 role / 分公司 / 部門 / 薪資資料全部受影響 |
| **payment_request_items** | 漏 `advanced_by` / `advanced_by_name` / `payment_method_id` / `tour_id` / `custom_request_date` | ✅ 剛修 |

## ⚠️ 中等（業務欄載不到、單功能壞）

| 表 | 漏掉欄位 | 影響 |
|---|---|---|
| **customers** | `passport_name_print` / `passport_image_url` / `avatar_url` / `emergency_contact` / `sex` / `nationality` / `total_points` / `linked_at` / `line_user_id` | 顧客顯示 / 護照列印 / VIP 點數系統卡 |
| **order_members** | `passport_name_print` / `remarks` / `custom_costs` / `room_type` / `roommate_id` / `special_requests` / `dietary_requirements` | 護照列印名 / 房型 / 飲食需求 |
| **orders** | `notes` / `identity_options` | 訂單備註 / 身份選項 |
| **receipts** | `refunded_at` / `refund_amount` / `refund_voucher_id` / `refund_notes` / `refunded_by` / `invoice_id` / `verified_by` / `verified_at` / `rejected_reason` | 退款流程 / 發票連動 / 驗證流程 |
| **tours** | `itinerary_id` / `tour_service_type` / `country_code` / `liability_insurance_coverage` / `medical_insurance_coverage` / `controller_id` / `quote_cost_structure` / `outbound_flight` / `return_flight` / `selling_price_per_person` / `days_count` / `custom_cost_fields` | 行程連動 / 旅平險覆蓋 / 自訂成本 |
| **quotes** | `version` / `versions` / `current_version_index` / `confirmed_version` / `country_code` | 雙軌版本系統可能讀不到版本資訊 |
| **tour_itinerary_items** | `day_title` / `day_route` / `day_note` / `day_blocks` / `is_same_accommodation` / `breakfast_preset` / `lunch_preset` / `dinner_preset` | 行程編輯器新功能 |
| **workspaces** | `payment_config` / `setup_state` / `enabled_tour_categories` / `home_country_code` / `default_billing_day_of_week` / `brand_primary_hex` / `print_accent_hex` / `is_multi_branch` / `is_multi_department` / `subscription_plan` / `subscription_period_end` / **`transfer_fee_mode`** / **`transfer_fee_unified_amount`** / **`transfer_fee_overflow_account_id`** / `bank_code` | 結帳設定 / Onboarding state / **transfer fee（5/15 你剛拍的設定）** |
| **attractions** | `type` / `ticket_price` / `contact_name` / `fax` / `country_code` | 景點詳情顯示 |
| **itineraries** | `price_note` / `country` / `city` / `template_*` / `hidden_items_*` / `price_tiers` | 行程模板 / 售價標示 |
| **channel_messages** | `recipient_employee_id` | 私訊收件人 |

## 🟢 輕微（軟刪 / 系統欄）

各表普遍漏軟刪三欄 `deleted_at / deleted_by / deleted_reason`、`country_code`、`channel_members.updated_at`。

軟刪欄若不在 select 內、表面看不出差、但 list 沒 filter `deleted_at IS NULL` 就會撈到軟刪列。需另對 `filterSoftDeleted` config。

## 為什麼這些 bug 「過去都能用」

1. **idb 持久 cache**：第一次 fetch 成功的版本永久存在 idb
2. **`staleTime: Infinity`**：SWR 永不主動 refetch
3. **Realtime 推播**：DB 變動 trigger invalidate、但 entity hook 改動 不會 trigger
4. **結果**：DB 演進 / entity hook 改動 → 真實 fetch 壞了、但 idb stale 還在 → user 看到「正常」、實際是化石

唯有 user：
- 換瀏覽器 / 清 cache → 第一次 fetch 失敗 → 整個列表壞
- 用新功能（新加欄位）→ undefined → 看起來「沒存進去」（你今天的 advanced_by 案例）

## 建議修法分層

### 階段 1（立即動、解最關鍵 bug）
- workspaces：砍 `type`、補 `transfer_fee_*` + `payment_config` + `setup_state`
- disbursement_orders：補 `payment_method_id` + `total_fee`
- employees：補 `bank_code` 等 4 欄 + `role_id` + `branch_id` + `department_id` + `is_dept_manager`

### 階段 2（中等業務欄）
- customers / order_members / orders / receipts / tours / quotes / tour_itinerary_items / itineraries / attractions / channel_messages 全部對齊

### 階段 3（系統欄）
- 軟刪 + country_code

## 影響範圍提醒

每次改 entity hook select、idb cache key 會變（剛修的 cacheKey hash 機制）。第一次 refresh 後使用者會看到「短暫 loading」、SWR 重 fetch 寫新 idb、之後恢復正常。

沒有資料丟失風險、只是緩存重建。
