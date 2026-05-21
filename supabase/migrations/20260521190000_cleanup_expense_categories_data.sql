-- 資料整理 expense_categories：砍個人記帳遺留 + 補實際業務用到的類別
-- William 2026-05-21 拍板：個人記帳不需要、之前實際用過的補進來
--
-- 動的事：
-- 1. DELETE 6 筆個人記帳遺留 type='expense'（購物 / 娛樂 / 醫療 / 教育 / 日用品 / 通訊）
-- 2. UPDATE「餐飲」→「餐食」（用戶實際 26 筆都填餐食、業務語通用）
-- 3. INSERT 5 筆團體請款類別（用戶實際填過、settings 沒）
--    保險 / 出團款 / 同業 / 員工代墊 / 導遊
-- 4. INSERT 1 筆公司支出（用戶實際填過 BNS）：獎金
-- 5. DELETE 4 筆 type='income' 個人記帳孤兒（薪資 / 獎金 / 投資 / 退款）
--    這 4 筆是個人記帳「收入」分類、UI 哪 tab 都不顯示、純垃圾
--
-- 紅線 #4 驗證（已 grep + DB 撈）：
-- - payment_request_items.category 純文字、0 筆用個人記帳 6 個名字
-- - voucher builder 依名字 lookup、刪了名字 fallback 走預設、無 break
-- - type='income' 4 筆無任何 UI / API caller
--
-- ⚠️ 寫檔教訓：原本條件加 is_system = true、但 9 筆個人記帳 row 的 is_system 是 false
-- （5/19 schema drift fix 加 is_system 欄時用預設 false、沒回頭把 row 改 true）
-- 修正：拿掉 is_system 條件、只靠 workspace_id IS NULL 判定系統預設（user 自加 row 一定有 workspace_id）
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase-aierp__apply_migration
-- 實際分 3 次 apply（修錯 + 補類別 + 砍 income 孤兒）、檔已合成最終正確版

BEGIN;

-- ─────────────────────────────────────────
-- 1. 砍個人記帳遺留 6 筆（type='expense'）
-- ─────────────────────────────────────────
DELETE FROM public.expense_categories
WHERE type = 'expense'
  AND workspace_id IS NULL
  AND name IN ('購物','娛樂','醫療','教育','日用品','通訊');

-- ─────────────────────────────────────────
-- 2. 餐飲 → 餐食
-- ─────────────────────────────────────────
UPDATE public.expense_categories
SET name = '餐食'
WHERE type = 'expense'
  AND workspace_id IS NULL
  AND name = '餐飲';

-- ─────────────────────────────────────────
-- 3. 補 5 筆團體請款類別（系統預設、全租戶共讀）
-- ─────────────────────────────────────────
INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id)
SELECT gen_random_uuid(), v.name, v.icon, '#c9aa7c', 'expense', v.sort_order, true, true, NULL
FROM (VALUES
  ('保險',       'Shield',     20),
  ('出團款',     'Plane',      21),
  ('同業',       'Handshake',  22),
  ('員工代墊',   'UserCheck',  23),
  ('導遊',       'UserStar',   24)
) AS v(name, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec
  WHERE ec.name = v.name AND ec.type = 'expense' AND ec.workspace_id IS NULL
);

-- ─────────────────────────────────────────
-- 4. 補 1 筆公司支出（獎金、實際用戶填過 BNS）
-- ─────────────────────────────────────────
INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id)
SELECT gen_random_uuid(), '獎金', 'Gift', '#6B7280', 'company_expense', 6, true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec
  WHERE ec.name = '獎金' AND ec.type = 'company_expense' AND ec.workspace_id IS NULL
);

-- ─────────────────────────────────────────
-- 5. 砍 4 筆 type='income' 個人記帳孤兒
--    UI 哪 tab 都不顯示（settings filter 是 expense / both / company_*）
--    用戶從沒填過 income type、純垃圾資料
-- ─────────────────────────────────────────
DELETE FROM public.expense_categories
WHERE type = 'income'
  AND workspace_id IS NULL;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- -- 還原個人記帳 6 筆 type='expense'
-- INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id) VALUES
--   (gen_random_uuid(), '購物',   'ShoppingBag', '#c9aa7c', 'expense', 3, true, false, NULL),
--   (gen_random_uuid(), '娛樂',   'PartyPopper', '#c9aa7c', 'expense', 4, true, false, NULL),
--   (gen_random_uuid(), '醫療',   'HeartPulse',  '#c9aa7c', 'expense', 6, true, false, NULL),
--   (gen_random_uuid(), '教育',   'GraduationCap','#c9aa7c', 'expense', 7, true, false, NULL),
--   (gen_random_uuid(), '日用品', 'Package',     '#c9aa7c', 'expense', 8, true, false, NULL),
--   (gen_random_uuid(), '通訊',   'Phone',       '#c9aa7c', 'expense', 9, true, false, NULL);
-- -- 還原 type='income' 4 筆
-- INSERT INTO public.expense_categories (id, name, icon, color, type, sort_order, is_active, is_system, workspace_id) VALUES
--   (gen_random_uuid(), '薪資', 'Wallet',     '#10B981', 'income', 1, true, false, NULL),
--   (gen_random_uuid(), '獎金', 'Gift',       '#10B981', 'income', 2, true, false, NULL),
--   (gen_random_uuid(), '投資', 'TrendingUp', '#10B981', 'income', 3, true, false, NULL),
--   (gen_random_uuid(), '退款', 'RotateCcw',  '#10B981', 'income', 4, true, false, NULL);
-- -- 還原 餐食 → 餐飲
-- UPDATE public.expense_categories SET name = '餐飲'
-- WHERE type = 'expense' AND workspace_id IS NULL AND name = '餐食';
-- -- 砍新增的 5+1
-- DELETE FROM public.expense_categories
-- WHERE workspace_id IS NULL
--   AND ((type='expense' AND name IN ('保險','出團款','同業','員工代墊','導遊'))
--    OR (type='company_expense' AND name='獎金'));
-- COMMIT;
