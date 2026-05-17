-- ─────────────────────────────────────────────────────────────────────────────
-- 砍 workspace_onboarding_seed trigger（SSOT 修正）
-- 2026-05-17 William 拍板「完整處理」
--
-- 為什麼砍：
--   5/14 加的 trg_workspaces_onboarding_seed trigger 跟 5/10 寫的 API
--   create-tenant-seed.ts 各自建一份 branches('HQ') + departments('HQ')、
--   結果 INSERT 第二筆時撞 branches_workspace_code_unique(workspace_id, code)、
--   每次建租戶都死在這步 → rollback → 自 5/14 起無人能成功建租戶。
--
-- 為什麼選砍 trigger（而不是改 API 跳過 HQ）：
--   1. API 接 brands / isMultiBranch / branches[] / 多種組合、邏輯比 trigger 完整
--   2. Trigger 只死板建 HQ、遇到客戶填多分公司還是會多塞髒資料
--   3. Trigger 不建 brands（William 5/14 註解寫「擱置」）、本來就不是完整 seed
--   4. SSOT 原則：業務邏輯散在 DB + 應用層兩處 = 將來再撞、文件也得寫兩份
--
-- 不影響的東西：
--   - branches / departments 的 type 欄位：保留（業務上仍有用、API 端改成自己設）
--   - 既有 workspace 的 type='headquarters' backfill：留著、不還原
--   - 4 個 default roles：API 端 seedRolesAndCapabilities() 會建 5 個更完整的
--
-- 後續配套（同 PR）：
--   - create-tenant-seed.ts 補上 type='headquarters' / 'branch' / 'department' 欄位
--   - scripts/audit-write-paths.ts 偵測同類雙寫
--   - CLAUDE.md 加「加新 trigger / API 寫入前必查同表寫入清單」規矩
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

DROP TRIGGER IF EXISTS trg_workspaces_onboarding_seed ON public.workspaces;
DROP FUNCTION IF EXISTS public.seed_new_workspace();

DO $$
BEGIN
  RAISE NOTICE '✓ trg_workspaces_onboarding_seed 已砍、API create-tenant-seed.ts 是唯一 onboarding SSOT';
END $$;

COMMIT;

-- ════ Rollback（萬一炸、複製貼上跑、會把 SSOT 撞車 bug 還回來、不建議）════
-- 直接重跑 20260514040000_workspace_onboarding_seed.sql 的 §3 + §4 即可還原 function + trigger
