-- ============================================================================
-- 20260503100000_reset_role_capabilities.sql
--
-- T7 final: 全清 capability 混亂、重來
-- William 2026-05-02 拍板：「業務員全員請調、沒現場運作、自己動手做」
--
-- 清掉所有非 VENTURO 的 role_capabilities、跑完 sync 後：
--   - 4 個租戶 admin role 會自動掛上 MODULES 衍生的乾淨 capability（從 sync script）
--   - 4 個租戶 non-admin role（業務 / 會計 / 助理 / 團控 / 導遊 / 領隊）變空、由 William 在 HR 角色管理頁手動指派
--   - VENTURO 平台主管不動（N-M02 設好、保留）
--
-- 連帶清掉：
--   - channel.* / dashboard.* / wishlist.* / design.* / tenants.* 等死碼
--   - customers.* vs database.customers.* 同義詞分裂
-- ============================================================================

DELETE FROM public.role_capabilities
WHERE role_id IN (
  SELECT r.id
  FROM public.workspace_roles r
  JOIN public.workspaces w ON w.id = r.workspace_id
  WHERE w.code <> 'VENTURO'
);
