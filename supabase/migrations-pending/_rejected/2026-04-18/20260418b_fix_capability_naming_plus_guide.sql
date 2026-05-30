-- ================================================================
-- Migration B: Fix capability naming + Add 導遊
-- ================================================================
-- Context: 上一版 migration 我把 capability flag 命名搞混（英文 tour_leader 應是領隊、但當成團控用）
--          William 2026-04-18 決定改清楚：三個角色分開（團控 / 領隊 / 導遊）
-- Rename 對應：
--   is_tour_leader  → is_tour_controller  (團控：內勤排程)
--   is_tour_guide   → is_tour_leader      (領隊：帶本團出國)
--   新增 is_tour_guide                     (導遊：當地或外包)
-- Risk: 🟢 LOW
--   - 這些欄位剛建（~5 分鐘前）、code 尚未使用、rename 無副作用
--   - 不動 row 資料（rename 是 metadata-only 操作）
-- ================================================================


-- ============ Step 1: Drop old indexes（refer 舊欄位名）============

DROP INDEX IF EXISTS public.idx_employees_is_tour_leader;
DROP INDEX IF EXISTS public.idx_employees_is_tour_guide;


-- ============ Step 2: Rename columns（分兩步避免撞名）============

ALTER TABLE public.employees RENAME COLUMN is_tour_leader TO is_tour_controller;
ALTER TABLE public.employees RENAME COLUMN is_tour_guide  TO is_tour_leader;


-- ============ Step 3: Add 導遊 flag ============

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_tour_guide BOOLEAN NOT NULL DEFAULT false;


-- ============ Step 4: Update comments ============

COMMENT ON COLUMN public.employees.is_tour_controller IS '能被選為團控（內勤、排程、調度）';
COMMENT ON COLUMN public.employees.is_tour_leader     IS '能被選為領隊（帶本團出國、現場照顧）';
COMMENT ON COLUMN public.employees.is_tour_guide      IS '能被選為導遊（當地導覽、通常外包 / 地接）';


-- ============ Step 5: Recreate indexes ============

CREATE INDEX IF NOT EXISTS idx_employees_is_tour_controller
  ON public.employees (workspace_id) WHERE is_tour_controller = true;

CREATE INDEX IF NOT EXISTS idx_employees_is_tour_leader
  ON public.employees (workspace_id) WHERE is_tour_leader = true;

CREATE INDEX IF NOT EXISTS idx_employees_is_tour_guide
  ON public.employees (workspace_id) WHERE is_tour_guide = true;


-- ============ Step 6: Update seed function with 6 default roles ============

CREATE OR REPLACE FUNCTION public.seed_default_roles_for_workspace(p_workspace_id UUID)
RETURNS TABLE(role_id UUID, role_name TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
  v_name TEXT; v_desc TEXT; v_order INT;
  v_defaults CONSTANT TEXT[][] := ARRAY[
    ARRAY['業務', '接客戶、建訂單、跟客戶聯繫',          '10'],
    ARRAY['團控', '團務排程、團員管理、內勤調度',         '20'],
    ARRAY['領隊', '帶本團出國、現場照顧團員',            '25'],
    ARRAY['導遊', '當地導覽、通常為外包或地接人員',      '28'],
    ARRAY['會計', '財務管理、對帳、代墊款、發票',        '30'],
    ARRAY['助理', '後勤支援、多為只讀權限',              '40']
  ];
  v_row TEXT[];
BEGIN
  FOREACH v_row SLICE 1 IN ARRAY v_defaults LOOP
    v_name := v_row[1]; v_desc := v_row[2]; v_order := v_row[3]::INT;

    SELECT id INTO v_role_id FROM public.workspace_roles
    WHERE workspace_id = p_workspace_id AND name = v_name LIMIT 1;

    IF v_role_id IS NULL THEN
      INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
      VALUES (p_workspace_id, v_name, v_desc, false, v_order)
      RETURNING id INTO v_role_id;
      role_id := v_role_id; role_name := v_name; action := 'created';
    ELSE
      role_id := v_role_id; role_name := v_name; action := 'already_exists';
    END IF;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============ Step 7: Notify PostgREST 重載 schema（避免前端緩存舊欄位名）============

NOTIFY pgrst, 'reload schema';
