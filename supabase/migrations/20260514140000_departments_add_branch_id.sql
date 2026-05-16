-- ════════════════════════════════════════════════════════════════════════════
-- Migration: departments 加 branch_id FK + backfill + NOT NULL
-- 2026-05-14 Robin
--
-- 背景：
--   三維（品牌／分公司／部門）架構 5/10 建表時、departments 漏掉 branch_id FK
--   結果 department 跟 branch 平行掛在 workspace 底下、不是父子關係。
--   實務後果：角落 workspace 有 2 個 branch（TP/角落旅行社 + TC/台中分公司）
--   但只 1 個 department「總部」、員工屬「總部」沒辦法區分台北還是台中。
--
--   W分身盤點結果（2026-05-14）：
--   - 全 workspace 4 個 department、backfill 目標 = 該 workspace type='headquarters' branch
--   - employees 15 筆、其中 14 筆 branch_id/department_id 都 NULL、1 筆（角落 E002）已完美對齊
--   - 0 筆不一致、migration 安全
--
-- 本 migration：
--   1. 加 branch_id uuid REFERENCES branches(id)、先 nullable
--   2. backfill：每個 department 對應該 workspace 的 type='headquarters' branch
--   3. 驗證 0 個 NULL、設 NOT NULL
--   4. 加 index on (workspace_id, branch_id)
--   5. 加 UNIQUE (branch_id, code) 防同分公司重複部門 code
--
-- 後續（同 PR 不同檔）：
--   - tenants/create route 建 default department 時帶 branch_id
--   - _helpers createDimension 支援 branch_id payload
--   - EmployeeForm 加級聯（選 branch → 過濾 dept）
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. 加欄位（暫時 nullable、好 backfill）
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;

-- 2. Backfill：每個 department 掛該 workspace type='headquarters' 的 branch
UPDATE public.departments d
SET branch_id = (
  SELECT b.id FROM public.branches b
  WHERE b.workspace_id = d.workspace_id AND b.type = 'headquarters'
  LIMIT 1
)
WHERE d.branch_id IS NULL;

-- 3. 驗證沒 NULL 殘留（若有就讓 migration 失敗、人工檢查）
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.departments WHERE branch_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % departments 沒對應 headquarters branch、檢查 branches 表 type 欄位', null_count;
  END IF;
END $$;

-- 4. 設 NOT NULL
ALTER TABLE public.departments
  ALTER COLUMN branch_id SET NOT NULL;

-- 5. Index：常用 query「某 branch 底下有哪些 department」
CREATE INDEX IF NOT EXISTS idx_departments_workspace_branch
  ON public.departments(workspace_id, branch_id);

-- 6. UNIQUE：防同分公司重複 code（同 workspace 不同 branch 可重複「業務部」、但同 branch 不能）
ALTER TABLE public.departments
  ADD CONSTRAINT departments_branch_code_unique UNIQUE (branch_id, code);

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_branch_code_unique;
-- DROP INDEX IF EXISTS idx_departments_workspace_branch;
-- ALTER TABLE public.departments ALTER COLUMN branch_id DROP NOT NULL;
-- ALTER TABLE public.departments DROP COLUMN IF EXISTS branch_id;
-- COMMIT;
