-- 補 20260326400000_add_company_category_types 漏跑的 INSERT
-- 該 migration 在 supabase_migrations.schema_migrations 紀錄 statements: []（不知為何 INSERT 部分沒進）
-- 結果：「公司支出項目」「公司收入項目」tab 永遠空白
-- 修法：重新跑那段 INSERT、ON CONFLICT 防重複
-- 系統預設 row → workspace_id = NULL、is_system = true、全租戶共讀
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase__apply_migration

BEGIN;

-- 公司支出 6 筆
INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id)
VALUES
  (gen_random_uuid(), '薪資', 'Users', '#6B7280', 'company_expense', 1, true, true, NULL),
  (gen_random_uuid(), '辦公費', 'Building2', '#6B7280', 'company_expense', 2, true, true, NULL),
  (gen_random_uuid(), '水電費', 'Zap', '#6B7280', 'company_expense', 3, true, true, NULL),
  (gen_random_uuid(), '差旅費', 'Plane', '#6B7280', 'company_expense', 4, true, true, NULL),
  (gen_random_uuid(), '交際費', 'Users', '#6B7280', 'company_expense', 5, true, true, NULL),
  (gen_random_uuid(), '雜支', 'MoreHorizontal', '#6B7280', 'company_expense', 99, true, true, NULL)
ON CONFLICT DO NOTHING;

-- 公司收入 3 筆
INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id)
VALUES
  (gen_random_uuid(), '利息收入', 'TrendingUp', '#10B981', 'company_income', 1, true, true, NULL),
  (gen_random_uuid(), '退款收入', 'RotateCcw', '#10B981', 'company_income', 2, true, true, NULL),
  (gen_random_uuid(), '雜項收入', 'MoreHorizontal', '#10B981', 'company_income', 99, true, true, NULL)
ON CONFLICT DO NOTHING;

COMMIT;

-- ════ Rollback（如果想 undo）════
-- DELETE FROM public.expense_categories
-- WHERE type IN ('company_expense','company_income')
--   AND is_system = true
--   AND workspace_id IS NULL;
