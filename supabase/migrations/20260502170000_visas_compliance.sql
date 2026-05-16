-- =====================================================
-- Visas Module — 憲法合規修齊
-- =====================================================
-- 對齊 docs/VENTURO_ERP_STANDARDS.md
--   Section 2: 業務表必要欄位 + index + trigger + RLS
--   Section 4: is_active 軟刪除（已存在、確認 NOT NULL DEFAULT true）
--   Section 10.11: audit FK 必指 employees(id)
--
-- 改動：
--   1. 砍 _needs_sync / _synced_at（過時 sync 欄位、code 沒用）
--   2. created_by text → uuid + FK employees(id) ON DELETE SET NULL
--   3. updated_by 加 FK employees(id) ON DELETE SET NULL
--   4. workspace_id 已 NOT NULL（OK）、is_active NOT NULL DEFAULT true 補齊
--   5. created_at / updated_at NOT NULL DEFAULT now() 補齊
--   6. updated_at trigger 已存在（update_visas_updated_at）OK
--   7. RLS 已存在 ERP 標準四條 policy（保留）
--
-- 安全：visas 表 0 row、所有 ALTER 直接生效不用搬資料
-- =====================================================

BEGIN;

-- 1) 砍 sync columns
ALTER TABLE public.visas DROP COLUMN IF EXISTS _needs_sync;
ALTER TABLE public.visas DROP COLUMN IF EXISTS _synced_at;
DROP INDEX IF EXISTS public.idx_visas_needs_sync;

-- 2) created_by text → uuid + FK to employees
ALTER TABLE public.visas DROP COLUMN IF EXISTS created_by;
ALTER TABLE public.visas
  ADD COLUMN created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- 3) updated_by FK
ALTER TABLE public.visas DROP CONSTRAINT IF EXISTS visas_updated_by_fkey;
ALTER TABLE public.visas
  ADD CONSTRAINT visas_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- 4) NOT NULL 補齊
UPDATE public.visas SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.visas
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

UPDATE public.visas SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.visas
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

UPDATE public.visas SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.visas
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- 5) 確認 trigger 存在（已有 update_visas_updated_at + trigger_auto_set_workspace_id）

COMMIT;

-- =====================================================
-- 寫入 schema_migrations
-- =====================================================
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260502170000', 'visas_compliance', NULL)
ON CONFLICT (version) DO NOTHING;
