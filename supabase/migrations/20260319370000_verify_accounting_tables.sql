-- 驗證會計系統所有表格
-- 執行此 SQL 確認所有表格都已建立

SELECT 
  t.tablename as "表名",
  pg_size_pretty(pg_total_relation_size('"public"."' || t.tablename || '"')) as "大小",
  CASE 
    WHEN c.relrowsecurity THEN '✅'
    ELSE '❌'
  END as "RLS",
  obj_description(('"public"."' || t.tablename || '"')::regclass, 'pg_class') as "說明"
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'chart_of_accounts',
    'erp_bank_accounts',
    'accounting_events',
    'journal_vouchers',
    'journal_lines',
    'posting_rules',
    'accounting_periods',
    'accounting_period_closings',
    'checks'
  )
ORDER BY t.tablename;

-- 檢查 ENUM 類型
SELECT 
  '✅ ENUM 類型' as "狀態",
  typname as "類型名稱",
  array_agg(enumlabel ORDER BY enumsortorder) as "可用值"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('accounting_event_type', 'accounting_event_status', 'voucher_status', 'subledger_type')
GROUP BY typname
ORDER BY typname;

-- 檢查關聯欄位
SELECT 
  '✅ 關聯欄位' as "狀態",
  table_name as "表名",
  column_name as "欄位名",
  data_type as "類型"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('payments', 'payment_requests')
  AND column_name = 'accounting_voucher_id';
