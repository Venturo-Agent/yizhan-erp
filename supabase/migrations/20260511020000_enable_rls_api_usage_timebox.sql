-- ─────────────────────────────────────────────────────────────────────────────
-- Tier 1 上線前資安洞修復（2026-05-11）：補兩個沒 RLS 的表
--
-- C1 audit 發現只有兩張 public 表 rowsecurity=false：
--   1. api_usage — system-level API 使用量計數（無 workspace_id / user_id）
--   2. timebox_scheduled_boxes — 個人時間管理（有 user_id）
--
-- 設計：
--   - api_usage: ENABLE RLS 不寫 policy = service_role only（系統內部用）
--   - timebox_scheduled_boxes: ENABLE RLS + user_id = auth.uid() 守門
--
-- 紅線檢核：
--   - 不 FORCE RLS（紅線 A、避免登入流程被擋）
--   - 不寫 admin bypass、不引用 is_super_admin（紅線 0）
--   - 兩表 0 rows、apply 無資料衝突風險
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. api_usage：system-level、service_role only
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_usage IS
  'System-level API usage counter (Anthropic / OpenRouter / Amadeus 等)。RLS enabled、無 policy = service_role only、應用層不直接 query。';

-- 2. timebox_scheduled_boxes：使用者私有
ALTER TABLE public.timebox_scheduled_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY timebox_owner_select ON public.timebox_scheduled_boxes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY timebox_owner_insert ON public.timebox_scheduled_boxes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY timebox_owner_update ON public.timebox_scheduled_boxes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY timebox_owner_delete ON public.timebox_scheduled_boxes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.timebox_scheduled_boxes IS
  '個人 timebox 時間管理。RLS：user 只能看 / 寫自己的 row（user_id = auth.uid()）。';

NOTIFY pgrst, 'reload schema';

COMMIT;
