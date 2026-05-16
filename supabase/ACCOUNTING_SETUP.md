# 會計系統資料庫建置指南

## 📋 需要建立的表格（9 個）

| #   | 表名                         | 用途         | 狀態    |
| --- | ---------------------------- | ------------ | ------- |
| 1   | `chart_of_accounts`          | 會計科目表   | ✅ 必要 |
| 2   | `erp_bank_accounts`          | 銀行帳戶     | ✅ 必要 |
| 3   | `accounting_events`          | 會計事件     | ✅ 必要 |
| 4   | `journal_vouchers`           | 傳票頭       | ✅ 必要 |
| 5   | `journal_lines`              | 傳票分錄     | ✅ 必要 |
| 6   | `posting_rules`              | 過帳規則     | ⚠️ 可選 |
| 7   | `accounting_periods`         | 會計期間     | ⚠️ 可選 |
| 8   | `accounting_period_closings` | 期末結轉記錄 | ✅ 必要 |
| 9   | `checks`                     | 票據管理     | ✅ 必要 |

---

## 🚀 快速執行（方法一：一鍵建置）

### 在 Supabase Dashboard 執行

1. 前往 Supabase Dashboard → SQL Editor
2. 複製 `migrations/20260319_complete_accounting_setup.sql` 內容
3. 執行
4. 執行 `migrations/20260319_verify_accounting_tables.sql` 驗證

---

## 🔧 手動執行（方法二：CLI）

```bash
cd ~/Projects/venturo-aierp

# 執行 migration
supabase db push

# 或單獨執行
psql $DATABASE_URL -f supabase/migrations/20260319_complete_accounting_setup.sql
```

---

## ✅ 驗證表格

執行驗證 SQL：

```sql
-- 在 Supabase Dashboard → SQL Editor 執行
\i supabase/migrations/20260319_verify_accounting_tables.sql
```

應該看到：

```
表名                          | 大小    | RLS | 說明
-----------------------------|---------|-----|----------
chart_of_accounts            | 8192 B  | ✅  | 會計科目表
erp_bank_accounts            | 8192 B  | ✅  | 銀行帳戶
accounting_events            | 8192 B  | ✅  | 會計事件
journal_vouchers             | 8192 B  | ✅  | 會計傳票
journal_lines                | 8192 B  | ✅  | 傳票分錄明細
posting_rules                | 8192 B  | ✅  | 過帳規則配置
accounting_periods           | 8192 B  | ✅  | 會計期間
accounting_period_closings   | 8192 B  | ✅  | 會計期末結轉記錄
checks                       | 8192 B  | ✅  | 票據/支票管理
```

---

## 📝 表格說明

### 1. chart_of_accounts（會計科目表）

```sql
科目代號 | 科目名稱 | 類型
---------|----------|--------
1100     | 銀行存款 | asset
1110     | 現金     | asset
2100     | 預收團款 | liability
3200     | 本期損益 | equity
3300     | 保留盈餘 | equity
4100     | 團費收入 | revenue
5100     | 團務成本 | cost
6100     | 刷卡手續費 | expense
```

### 2. journal_vouchers（傳票）

```sql
傳票編號 | 日期 | 說明 | 借方 | 貸方 | 狀態
---------|------|------|------|------|------
JV202603xxxx | 2026-03-19 | 收款 | 1,000 | 1,000 | posted
```

### 3. journal_lines（分錄）

```sql
傳票編號 | 行號 | 科目 | 借方 | 貸方 | 說明
---------|------|------|------|------|------
JV202603xxxx | 1 | 1100 | 1,000 | 0 | 銀行存款
JV202603xxxx | 2 | 2100 | 0 | 1,000 | 預收團款
```

---

## 🔑 ENUM 類型

系統會自動建立以下 ENUM：

1. **accounting_event_type**
   - customer_receipt_posted（客戶收款）
   - supplier_payment_posted（供應商付款）
   - group_settlement_posted（結團）
   - manual_voucher（手動傳票）

2. **voucher_status**
   - draft（草稿）
   - posted（已過帳）
   - reversed（已反沖）
   - locked（已鎖定）

3. **subledger_type**
   - customer（客戶）
   - supplier（供應商）
   - bank（銀行）
   - employee（員工）

---

## ⚠️ 注意事項

1. **RLS 政策**：所有表格都啟用 RLS，只能存取自己 workspace 的資料
2. **外鍵約束**：journal_lines 會自動 CASCADE DELETE（刪除傳票時自動刪除分錄）
3. **UNIQUE 約束**：
   - 科目代號（每個 workspace 唯一）
   - 傳票編號（每個 workspace 唯一）
   - 支票號碼（每個 workspace 唯一）

---

## 🐛 常見問題

### Q: 表格已存在怎麼辦？

A: SQL 使用 `CREATE TABLE IF NOT EXISTS`，不會重複建立

### Q: RLS 政策衝突？

A: SQL 先 `DROP POLICY IF EXISTS` 再建立，會覆蓋舊的

### Q: 如何刪除所有表格重建？

A: **危險操作！** 只在測試環境執行：

```sql
DROP TABLE IF EXISTS public.checks CASCADE;
DROP TABLE IF EXISTS public.journal_lines CASCADE;
DROP TABLE IF EXISTS public.journal_vouchers CASCADE;
DROP TABLE IF EXISTS public.accounting_period_closings CASCADE;
DROP TABLE IF EXISTS public.accounting_events CASCADE;
DROP TABLE IF EXISTS public.erp_bank_accounts CASCADE;
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
DROP TABLE IF EXISTS public.posting_rules CASCADE;
DROP TABLE IF EXISTS public.accounting_periods CASCADE;

-- 刪除 ENUM
DROP TYPE IF EXISTS voucher_status CASCADE;
DROP TYPE IF EXISTS accounting_event_type CASCADE;
DROP TYPE IF EXISTS accounting_event_status CASCADE;
DROP TYPE IF EXISTS subledger_type CASCADE;

-- 然後重新執行 20260319_complete_accounting_setup.sql
```

---

## 📞 支援

如果遇到問題：

1. 檢查 Supabase logs
2. 確認 `get_current_user_workspace()` 和 `is_super_admin()` 函數存在
3. 確認 workspaces 表存在且有資料
