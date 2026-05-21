-- 補 20260326400000_add_company_category_types 漏跑的 INSERT
-- 該 migration 在 supabase_migrations.schema_migrations 紀錄 statements: []（不知為何 INSERT 部分沒進）
-- 結果：「公司支出項目」「公司收入項目」tab 永遠空白
-- 修法：重新跑那段 INSERT、WHERE NOT EXISTS 防重複
-- 系統預設 row → workspace_id = NULL、is_system = true、全租戶共讀
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase-aierp__apply_migration
--
-- 2026-05-21 補修：原版用 ON CONFLICT DO NOTHING、但 PK 是 gen_random_uuid()、永遠不會撞
-- 表也沒 (name, type) unique constraint、所以 ON CONFLICT 等於沒寫、重跑會塞重複 row
-- 改用 INSERT ... SELECT ... WHERE NOT EXISTS 真 idempotent

BEGIN;

-- 公司支出 6 筆
INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id)
SELECT gen_random_uuid(), v.name, v.icon, '#6B7280', 'company_expense', v.sort_order, true, true, NULL
FROM (VALUES
  ('薪資', 'Users', 1),
  ('辦公費', 'Building2', 2),
  ('水電費', 'Zap', 3),
  ('差旅費', 'Plane', 4),
  ('交際費', 'Users', 5),
  ('雜支', 'MoreHorizontal', 99)
) AS v(name, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec
  WHERE ec.name = v.name AND ec.type = 'company_expense' AND ec.is_system = true AND ec.workspace_id IS NULL
);

-- 公司收入 3 筆
INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id)
SELECT gen_random_uuid(), v.name, v.icon, '#10B981', 'company_income', v.sort_order, true, true, NULL
FROM (VALUES
  ('利息收入', 'TrendingUp', 1),
  ('退款收入', 'RotateCcw', 2),
  ('雜項收入', 'MoreHorizontal', 99)
) AS v(name, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec
  WHERE ec.name = v.name AND ec.type = 'company_income' AND ec.is_system = true AND ec.workspace_id IS NULL
);

COMMIT;

-- ════ Rollback（如果想 undo）════
-- DELETE FROM public.expense_categories
-- WHERE type IN ('company_expense','company_income')
--   AND is_system = true
--   AND workspace_id IS NULL;
