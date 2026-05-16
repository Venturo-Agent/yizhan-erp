-- ============================================
-- 自動設定 workspace_id（INSERT 時）
-- ============================================
-- 問題：客戶端 insert 時若漏傳 workspace_id，RLS 會直接 403
-- 解法：DB trigger 自動從 auth session 帶入 workspace_id
-- ============================================

BEGIN;

-- 通用 trigger function：INSERT 時自動補上 workspace_id
CREATE OR REPLACE FUNCTION public.auto_set_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只在 workspace_id 為 NULL 時自動帶入
  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := get_current_user_workspace();
  END IF;
  RETURN NEW;
END;
$$;

-- 套用到所有需要 workspace 隔離的業務表格
DO $$
DECLARE
  tables text[] := ARRAY[
    'tours', 'orders', 'customers', 'payments', 'payment_requests',
    'disbursement_orders', 'receipts', 'quotes', 'contracts',
    'itineraries', 'visas', 'vendor_costs', 'tasks', 'todos',
    'bulletins', 'channels', 'channel_groups', 'tour_requests',
    'tour_destinations', 'pnrs', 'messages', 'calendar_events',
    'proposals', 'proposal_packages', 'tour_documents'
  ];
  tbl text;
  has_workspace_id boolean;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'workspace_id'
      ) INTO has_workspace_id;

      IF has_workspace_id THEN
        -- 先刪除舊的（如果有）
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_auto_set_workspace_id ON public.%I', tbl);
        -- 建立 BEFORE INSERT trigger
        EXECUTE format(
          'CREATE TRIGGER trigger_auto_set_workspace_id ' ||
          'BEFORE INSERT ON public.%I ' ||
          'FOR EACH ROW EXECUTE FUNCTION auto_set_workspace_id()',
          tbl
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

COMMIT;
