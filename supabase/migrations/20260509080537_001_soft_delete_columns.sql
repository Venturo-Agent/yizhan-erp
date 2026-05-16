-- =============================================================================
-- 軟刪除欄位（純加法、零風險）
-- 對應 ADR-0002 / refactor-backlog #23
-- =============================================================================
--
-- 執行條件：
--   1. 搬完伺服器（2026-05-10）
--   2. ADR-0002 拍板「適用範圍」「保留期」
--   3. 應用層 enforceWorkspaceScope helper 已升級加 deleted_at filter
--
-- 為什麼純加法 + 安全：
--   - 全部 NULL 預設、既有資料不受影響
--   - 沒任何 query 走 deleted_at filter 前、軟刪除等於沒做（向後兼容）
--   - 加 partial index 不影響活資料 query 效能（甚至更快）
--
-- Rollback：DROP COLUMN deleted_at, deleted_by, deleted_reason（純逆向、可逆）
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 適用 table 清單（依 ADR-0002 草案）
-- ─────────────────────────────────────────────────────────────────────────────

-- 注意：審計欄位 FK 必指 public.employees(id)、不是 auth.users（CLAUDE.md 紅線 #2）

DO $$
DECLARE
  target_table TEXT;
  -- 業務 table 清單（依 ADR-0002 拍板可調整）
  tables TEXT[] := ARRAY[
    'orders',
    'tours',
    'customers',
    'payments',           -- 注意：依 ADR-0002 永久不硬刪
    'payment_requests',
    'disbursement_orders',
    'receipts',
    'quotes',
    'attractions',
    'restaurants',
    'hotels',
    'suppliers',
    'tour_templates',
    'employees'           -- 注意：依 ADR-0002 永久不硬刪
  ];
BEGIN
  FOREACH target_table IN ARRAY tables LOOP
    -- 只對 public schema 已存在的 table 動作
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = target_table
    ) THEN
      -- deleted_at
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL',
        target_table
      );
      -- deleted_by → employees(id)、不是 auth.users
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID NULL REFERENCES public.employees(id) ON DELETE SET NULL',
        target_table
      );
      -- deleted_reason（合規場景需要）
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL',
        target_table
      );

      -- partial index：活資料 query 走索引、deleted 不參與
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id) WHERE deleted_at IS NULL',
        format('idx_%s_active', target_table),
        target_table
      );

      RAISE NOTICE '✓ % 加了 soft delete 欄位 + index', target_table;
    ELSE
      RAISE NOTICE '✗ % 不存在、跳過', target_table;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- 驗證查詢（執行完跑這幾條確認）
-- =============================================================================

-- 1. 確認所有 table 都有 deleted_at
-- SELECT table_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND column_name = 'deleted_at'
-- ORDER BY table_name;

-- 2. 確認 partial index 都建好
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%_active'
-- ORDER BY indexname;

-- 3. 既有資料 deleted_at 都是 NULL（活的）
-- SELECT COUNT(*) FROM public.orders WHERE deleted_at IS NOT NULL; -- 預期 0
