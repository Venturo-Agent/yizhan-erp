-- ════════════════════════════════════════════════════════════════════════════
-- Ch6: 移除 is_super_admin() PostgreSQL function
--
-- 為什麼：
--   is_super_admin() 是 is_super_admin 時代的殘留 stub（永遠回傳 false）。
--   現行架構不允許任何 user/role 層級的超級管理員概念（見 CLAUDE.md 紅線 #0）。
--   此 function 繼續存在會：
--     1. 污染 generated types.ts（出現不應存在的 function 型別）
--     2. 引誘未來開發者誤用（以為「這個 function 是設計的一部分」）
--   DB 重建後確認所有 RLS policy 均已改用 has_capability_for_workspace()，
--   無任何 policy 仍依賴此 function，可安全移除。
--
-- 前置確認：
--   SELECT pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
--   FROM pg_policy pol
--   WHERE pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%is_super_admin%'
--      OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%is_super_admin%';
--   → 預期 0 筆（代表無 RLS policy 引用此 function）
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 安全確認：確保沒有 RLS policy 仍引用 is_super_admin()
-- （若有，下面 DROP 還是會成功，但這條查詢讓 migration log 留有紀錄）
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policy pol
  WHERE pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%is_super_admin%'
     OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%is_super_admin%';

  IF policy_count > 0 THEN
    RAISE WARNING 'is_super_admin() 仍被 % 條 RLS policy 引用。請先更新這些 policy 再移除此 function。', policy_count;
  ELSE
    RAISE NOTICE 'is_super_admin() 未被任何 RLS policy 引用，安全移除。';
  END IF;
END $$;

-- 移除 is_super_admin()（idempotent: IF EXISTS）
DROP FUNCTION IF EXISTS public.is_super_admin();

COMMIT;

-- ════ Rollback（若需還原，複製貼上執行）════
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.is_super_admin()
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE SECURITY DEFINER
-- AS $$
--   SELECT false; -- stub: 永遠回傳 false，超級管理員概念已廢棄
-- $$;
-- COMMIT;
