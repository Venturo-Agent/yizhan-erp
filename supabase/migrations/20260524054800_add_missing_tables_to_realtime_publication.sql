-- ════════════════════════════════════════════════════════════════
-- 把 4 張「entity hook 訂閱了 realtime、卻沒進 publication」的表加進去
-- 為什麼：這 4 張 code 訂閱了 realtime、但 Supabase 沒推送 → 訂閱靜默失效
--         → 新增/刪除後畫面不動要 F5。加進 publication = realtime 即時生效。
-- REPLICA IDENTITY 維持 default(PK)、跟現有 43 張 realtime 表一致（RLS 正常運作）。
-- 來源：2026-05-24 體制級地基藍圖 step 1「止血」、Claude 主導 + MCP apply。
-- 狀態：已於 2026-05-24 經 MCP apply 到 production（aawrgygqgemgqssflfrx）並驗證。
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['bank_accounts', 'contracts', 'expense_categories', 'payment_methods'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ════ Rollback（萬一要還原）════
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.bank_accounts, public.contracts, public.expense_categories, public.payment_methods;
