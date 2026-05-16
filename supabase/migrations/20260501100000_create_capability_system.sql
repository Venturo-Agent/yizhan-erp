-- ============================================================
-- 權限系統重構 Step 1 of 4 (2026-05-01)
-- 引入 APP 風格 capability 系統 (role_capabilities + has_capability RPC)
-- 舊系統 (role_tab_permissions / roles.is_admin / etc.) 暫不動、並存
-- 後續 Step 2 sidebar 試切、Step 3 模組逐一搬、Step 4 清場
-- ============================================================

-- ============================================================
-- 1. role_capabilities 資格表
--    每筆 = 「這個 role 擁有 / 不擁有 這個 capability」
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_capabilities (
  role_id uuid NOT NULL REFERENCES public.workspace_roles(id) ON DELETE CASCADE,
  capability_code text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, capability_code)
);

CREATE INDEX IF NOT EXISTS idx_role_capabilities_code_enabled
  ON public.role_capabilities(capability_code) WHERE enabled = true;

COMMENT ON TABLE public.role_capabilities IS
  'APP-style capability ledger. Permission refactor Step 1 (2026-05-01). Coexists with role_tab_permissions until Step 4 cleanup.';

-- ============================================================
-- 2. has_capability() / has_capability_for_workspace()
--    SECURITY DEFINER 是為了繞 RLS 直接查、回呼者用自己的 auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_capability(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.role_capabilities rc ON rc.role_id = e.role_id
    WHERE e.user_id = auth.uid()
      AND rc.capability_code = _code
      AND rc.enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_capability_for_workspace(_workspace_id uuid, _code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.role_capabilities rc ON rc.role_id = e.role_id
    WHERE e.user_id = auth.uid()
      AND e.workspace_id = _workspace_id
      AND rc.capability_code = _code
      AND rc.enabled = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_capability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_capability_for_workspace(uuid, text) TO authenticated;

-- ============================================================
-- 3. RLS on role_capabilities
-- ============================================================
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rc_member_read" ON public.role_capabilities;
CREATE POLICY "rc_member_read"
  ON public.role_capabilities
  FOR SELECT
  TO authenticated
  USING (
    role_id IN (
      SELECT wr.id FROM public.workspace_roles wr
      WHERE wr.workspace_id IN (
        SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "rc_hr_write" ON public.role_capabilities;
CREATE POLICY "rc_hr_write"
  ON public.role_capabilities
  FOR ALL
  TO authenticated
  USING (
    public.has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'
    )
  )
  WITH CHECK (
    public.has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'
    )
  );

-- ============================================================
-- 4. Backfill: 把現有 role_tab_permissions 翻譯成 capability code
--    命名規則：
--      tab_code IS NULL  → "{module}.{action}"     例：tours.read
--      tab_code 不為 null → "{module}.{tab}.{action}" 例：hr.roles.write
-- ============================================================
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT DISTINCT
  role_id,
  CASE
    WHEN tab_code IS NULL THEN module_code || '.read'
    ELSE module_code || '.' || tab_code || '.read'
  END,
  true
FROM public.role_tab_permissions
WHERE can_read = true
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT DISTINCT
  role_id,
  CASE
    WHEN tab_code IS NULL THEN module_code || '.write'
    ELSE module_code || '.' || tab_code || '.write'
  END,
  true
FROM public.role_tab_permissions
WHERE can_write = true
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;
