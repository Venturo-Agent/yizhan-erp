-- =============================================
-- Wave 12 會計清理 — 幫 JINGYAO / YUFEN 補種預設科目表
-- 2026-04-23
--
-- 背景：
--   /api/tenants/create 沒 seed chart_of_accounts（Wave 11 已拔除 /accounting 主頁
--   偷偷觸發 initialize 的邏輯）、所以 JINGYAO（璟曜）跟 YUFEN（御風）這兩家
--   租戶建立時漏種科目表、進 /accounting 會空白。
--
-- 做法：
--   Source of truth：src/types/accounting.types.ts DEFAULT_ACCOUNTS（21 筆）
--   使用 ON CONFLICT DO NOTHING、未來意外重跑也安全。
--
-- 不含（放另外 wave）：
--   - DROP accounts / accounting_subjects：
--     兩張表雖然程式已不引用、但 DB 仍有 FK 指過去：
--     * personal_expenses.account_id → accounts
--     * payment_methods.debit_account_id / credit_account_id → accounting_subjects
--     程式的 Supabase embedded query 寫 chart_of_accounts!debit_account_id、
--     跟 DB 的 FK 對象不一致、要先修 FK 才能安全 DROP。
--   - accounting_accounts 還保留、Wave 13 處理 accounting-store 時一併清理。
-- =============================================

INSERT INTO public.chart_of_accounts
  (workspace_id, code, name, account_type, parent_id, is_active, is_system_locked, description)
SELECT ws.id, v.code, v.name, v.account_type::text, NULL, true, true, v.description
FROM (
  VALUES
    -- 資產
    ('1100', '銀行存款',                'asset',     NULL),
    ('1110', '現金',                    'asset',     NULL),
    ('1200', '預付團務成本',            'asset',     '未結團的預付成本'),
    -- 負債
    ('2100', '預收團款',                'liability', '未結團的預收款項'),
    ('2200', '代收稅金（應付）',        'liability', '12% 代收稅金'),
    ('2300', '獎金應付帳款',            'liability', NULL),
    ('2400', '代收款－員工自付',        'liability', '勞健保等'),
    -- 權益
    ('3100', '股本',                    'equity',    '實收資本'),
    ('3200', '本期損益',                'equity',    '期末結轉用，匯集損益科目餘額'),
    ('3300', '保留盈餘',                'equity',    '累積盈虧，本期損益結轉至此'),
    -- 收入
    ('4100', '團費收入',                'revenue',   '結團才認列'),
    ('4200', '其他收入－行政費收入',    'revenue',   NULL),
    -- 成本
    ('5100', '團務成本',                'cost',      '結團才成立'),
    ('5110', '團務成本－行政費',        'cost',      NULL),
    ('5120', '團務成本－代收稅金',      'cost',      '12%'),
    ('5130', '團務成本－業務獎金',      'cost',      NULL),
    ('5140', '團務成本－OP獎金',        'cost',      NULL),
    ('5150', '團務成本－團績獎金',      'cost',      NULL),
    -- 費用
    ('6100', '刷卡手續費費用',          'expense',   '實扣 1.68%'),
    ('6200', '勞健保費用',              'expense',   '公司負擔'),
    ('6300', '利息費用',                'expense',   NULL)
) AS v(code, name, account_type, description)
CROSS JOIN (
  SELECT id FROM public.workspaces
  WHERE code IN ('JINGYAO', 'YUFEN')
) AS ws
ON CONFLICT (workspace_id, code) DO NOTHING;
