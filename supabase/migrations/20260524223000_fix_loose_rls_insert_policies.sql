-- ════════════════════════════════════════════════════════════════════
-- 補跨租戶寫入破口：收緊寬鬆的 RLS policy（紅線 H）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼（2026-05-24 攻擊式 RLS 稽核發現）：
-- 對自家系統做 penetration 式稽核、抓到一批「RLS 看似有、實則跨租戶可穿」的 policy：
--   1. workspace_bonus_defaults：FOR ALL policy 寫死 using=true / check=true
--      → 任何登入者可讀+寫「任意租戶」的獎金預設（有 workspace_id、policy 沒過濾）。
--   2. 10 張 workspace-scoped 表的 INSERT policy WITH CHECK (true)
--      → 任何登入者可 INSERT 一筆帶「別租戶 workspace_id」的列（跨租戶寫入 / 污染）。
--
-- 修法：用 ALTER POLICY 只改檢查運算式（保留 command + role、不 DROP+CREATE、風險最小）。
-- 套用 receipts 同款 pattern：(workspace_id IS NULL) OR (workspace_id = get_current_user_workspace())
--   - 擋掉攻擊（帶受害租戶 workspace_id 的寫入 → 既非 null 也非自己 → 拒絕）。
--   - 不打斷現有新增：entity hook 新增時已自動帶使用者自己的 workspace_id（entityHookCrud）、
--     且保留 NULL 允許（相容全域 / 既有 null-workspace 列、跟 receipts 一致）。
--
-- 風險控管：ALTER POLICY 可逆（見末尾 rollback）；apply 前跑 tests/e2e/login-api.spec.ts（紅線 A）。
-- 註：這些表的 SELECT/UPDATE/DELETE policy 本來就 workspace-gated（稽核未列）、故只收 INSERT + bonus_defaults。
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. workspace_bonus_defaults：全開 FOR ALL policy → workspace-scoped（讀寫都收）
ALTER POLICY authenticated_workspace_bonus_defaults ON public.workspace_bonus_defaults
  USING ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()))
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));

-- 2. INSERT WITH CHECK (true) → workspace-scoped（10 張 workspace-scoped 表）
ALTER POLICY accounting_period_closings_insert ON public.accounting_period_closings
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY airport_images_insert ON public.airport_images
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY background_tasks_insert ON public.background_tasks
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY calendar_events_insert ON public.calendar_events
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY companies_insert ON public.companies
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY company_contacts_insert ON public.company_contacts
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY image_library_insert ON public.image_library
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY todos_insert ON public.todos
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY workspace_countries_insert ON public.workspace_countries
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
ALTER POLICY workspace_selector_fields_insert ON public.workspace_selector_fields
  WITH CHECK ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));

COMMIT;

-- ════ Rollback（萬一新增被擋、複製貼上跑還原成原本寬鬆 policy）════
-- BEGIN;
-- ALTER POLICY authenticated_workspace_bonus_defaults ON public.workspace_bonus_defaults USING (true) WITH CHECK (true);
-- ALTER POLICY accounting_period_closings_insert ON public.accounting_period_closings WITH CHECK (true);
-- ALTER POLICY airport_images_insert ON public.airport_images WITH CHECK (true);
-- ALTER POLICY background_tasks_insert ON public.background_tasks WITH CHECK (true);
-- ALTER POLICY calendar_events_insert ON public.calendar_events WITH CHECK (true);
-- ALTER POLICY companies_insert ON public.companies WITH CHECK (true);
-- ALTER POLICY company_contacts_insert ON public.company_contacts WITH CHECK (true);
-- ALTER POLICY image_library_insert ON public.image_library WITH CHECK (true);
-- ALTER POLICY todos_insert ON public.todos WITH CHECK (true);
-- ALTER POLICY workspace_countries_insert ON public.workspace_countries WITH CHECK (true);
-- ALTER POLICY workspace_selector_fields_insert ON public.workspace_selector_fields WITH CHECK (true);
-- COMMIT;
