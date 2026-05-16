-- =====================================================
-- 會計模組 V2 更新：刷卡收款相關科目
-- 建立日期：2025-12-28
-- 說明：新增刷卡手續費、刷卡回饋相關會計科目
-- =====================================================

BEGIN;

-- =====================================================
-- 1. 新增刷卡相關會計科目
-- =====================================================

-- 預付團務成本－刷卡成本（資產類 1104 的子科目）
INSERT INTO public.accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
VALUES (NULL, '110401', '預付團務成本－刷卡成本', 'asset', 4, true, true, '刷卡收款時預付的 2% 團成本')
ON CONFLICT (workspace_id, code) DO NOTHING;

-- 其他收入－刷卡回饋（收入類）
INSERT INTO public.accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
VALUES (NULL, '4103', '其他收入－刷卡回饋', 'revenue', 2, true, true, '刷卡收款時 0.32% 公司回饋收入')
ON CONFLICT (workspace_id, code) DO NOTHING;

-- 團務成本－刷卡成本（結團時轉列）
INSERT INTO public.accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
VALUES (NULL, '5107', '團務成本－刷卡成本', 'expense', 2, true, true, '結團時從預付團務成本轉列的刷卡成本')
ON CONFLICT (workspace_id, code) DO NOTHING;

-- =====================================================
-- 2. 更新 parent_id（建立科目層級關係）
-- =====================================================

-- 預付團務成本－刷卡成本 的父科目是 預付團費(1104)
UPDATE public.accounting_subjects
SET parent_id = (SELECT id FROM public.accounting_subjects WHERE code = '1104' AND workspace_id IS NULL)
WHERE code = '110401' AND workspace_id IS NULL;

-- 其他收入－刷卡回饋 的父科目是 營業收入(4000)
UPDATE public.accounting_subjects
SET parent_id = (SELECT id FROM public.accounting_subjects WHERE code = '4000' AND workspace_id IS NULL)
WHERE code = '4103' AND workspace_id IS NULL;

-- 團務成本－刷卡成本 的父科目是 營業成本(5000)
UPDATE public.accounting_subjects
SET parent_id = (SELECT id FROM public.accounting_subjects WHERE code = '5000' AND workspace_id IS NULL)
WHERE code = '5107' AND workspace_id IS NULL;

-- =====================================================
-- 3. 新增行政費、代收稅金相關科目（結團用）
-- =====================================================

-- 其他收入－行政費
INSERT INTO public.accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
VALUES (NULL, '4104', '其他收入－行政費', 'revenue', 2, true, true, '結團時每人 $10 行政費')
ON CONFLICT (workspace_id, code) DO NOTHING;

-- 代收稅金（負債類）
INSERT INTO public.accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
VALUES (NULL, '2103', '代收稅金', 'liability', 3, true, true, '結團時 12% 代收稅金')
ON CONFLICT (workspace_id, code) DO NOTHING;

-- 應付獎金（負債類）
INSERT INTO public.accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
VALUES (NULL, '2104', '應付獎金', 'liability', 3, true, true, '團績獎金應付款')
ON CONFLICT (workspace_id, code) DO NOTHING;

-- 獎金支出（費用類）
INSERT INTO public.accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
VALUES (NULL, '6105', '獎金支出', 'expense', 2, true, true, '業務/OP 獎金支出')
ON CONFLICT (workspace_id, code) DO NOTHING;

-- 更新 parent_id
UPDATE public.accounting_subjects
SET parent_id = (SELECT id FROM public.accounting_subjects WHERE code = '4000' AND workspace_id IS NULL)
WHERE code = '4104' AND workspace_id IS NULL;

UPDATE public.accounting_subjects
SET parent_id = (SELECT id FROM public.accounting_subjects WHERE code = '2100' AND workspace_id IS NULL)
WHERE code IN ('2103', '2104') AND workspace_id IS NULL;

UPDATE public.accounting_subjects
SET parent_id = (SELECT id FROM public.accounting_subjects WHERE code = '6000' AND workspace_id IS NULL)
WHERE code = '6105' AND workspace_id IS NULL;

COMMIT;
