-- =====================================================
-- 新增公司收支項目類型
-- 2026-03-26
-- =====================================================
-- expense_categories.type 新增：
--   - company_expense: 公司支出（薪資、辦公費、水電）
--   - company_income: 公司收入（利息、退款、雜項收入）
-- =====================================================

-- 1. 更新 type check constraint
ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_type_check;
ALTER TABLE expense_categories ADD CONSTRAINT expense_categories_type_check 
  CHECK (type IN ('expense', 'income', 'both', 'company_expense', 'company_income'));

-- 2. 插入預設公司支出項目
INSERT INTO expense_categories (id, name, icon, color, type, sort_order, is_active, is_system)
VALUES
  (gen_random_uuid(), '薪資', 'Users', '#6B7280', 'company_expense', 1, true, true),
  (gen_random_uuid(), '辦公費', 'Building2', '#6B7280', 'company_expense', 2, true, true),
  (gen_random_uuid(), '水電費', 'Zap', '#6B7280', 'company_expense', 3, true, true),
  (gen_random_uuid(), '差旅費', 'Plane', '#6B7280', 'company_expense', 4, true, true),
  (gen_random_uuid(), '交際費', 'Users', '#6B7280', 'company_expense', 5, true, true),
  (gen_random_uuid(), '雜支', 'MoreHorizontal', '#6B7280', 'company_expense', 99, true, true)
ON CONFLICT DO NOTHING;

-- 3. 插入預設公司收入項目
INSERT INTO expense_categories (id, name, icon, color, type, sort_order, is_active, is_system)
VALUES
  (gen_random_uuid(), '利息收入', 'TrendingUp', '#10B981', 'company_income', 1, true, true),
  (gen_random_uuid(), '退款收入', 'RotateCcw', '#10B981', 'company_income', 2, true, true),
  (gen_random_uuid(), '雜項收入', 'MoreHorizontal', '#10B981', 'company_income', 99, true, true)
ON CONFLICT DO NOTHING;

-- 4. 加入 Comment
COMMENT ON COLUMN expense_categories.type IS '類型: expense=團體費用, income=團體收入, both=兩者, company_expense=公司支出, company_income=公司收入';
