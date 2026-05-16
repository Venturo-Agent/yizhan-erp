-- =====================================================
-- LinkPay Logs Module — 憲法合規修齊
-- =====================================================
-- 對齊 docs/VENTURO_ERP_STANDARDS.md
--   Section 2: 業務表必要欄位 + index + trigger + RLS
--   Section 2 例外: log 表非業務 entity，可豁免 is_active 軟刪除
--                   （linkpay_logs 是金流串接 audit log、1:1 跟 receipt 綁、
--                    軟刪除沒語意，刪 row 等同金流斷帳）
--
-- 現況檢查：
--   ✓ id uuid PK
--   ✓ workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
--   ✓ created_at / updated_at timestamptz DEFAULT now()
--   ✓ created_by / updated_by uuid REFERENCES employees(id) ON DELETE SET NULL
--   ✓ workspace_id index (idx_linkpay_workspace)
--   ✓ RLS 已啟用、4-policy（ERP 標準）
--   ✗ updated_at 沒 trigger（雖有欄位但不會自動更新）
--   ✗ created_at / updated_at NOT NULL 還沒鎖
--   ⚠ is_active 不適用（log 表豁免、Section 2 允許）
--
-- 改動：
--   1. 補 updated_at trigger
--   2. created_at / updated_at NOT NULL 鎖死
--
-- 不動 webhook callback 邏輯（藍新銀行 callback、改錯整個金流斷）
-- =====================================================

BEGIN;

-- 1) 補 updated_at trigger
DROP TRIGGER IF EXISTS update_linkpay_logs_updated_at ON public.linkpay_logs;
CREATE TRIGGER update_linkpay_logs_updated_at
  BEFORE UPDATE ON public.linkpay_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) NOT NULL 鎖死
UPDATE public.linkpay_logs SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.linkpay_logs
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

UPDATE public.linkpay_logs SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.linkpay_logs
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

COMMIT;

-- =====================================================
-- 寫入 schema_migrations
-- =====================================================
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260502180000', 'linkpay_logs_compliance', NULL)
ON CONFLICT (version) DO NOTHING;
