-- ============================================================================
-- 20260503010000_drop_duplicate_updated_at_triggers.sql
--
-- B-002: 清掉 payment_requests / suppliers 表的 duplicate updated_at trigger
-- 來源：docs/_followup_backlog.md
-- 前置：B-001（已套用、12 個變體 function 已 DROP）
--
-- 兩張表各自掛了 2 條 updated_at trigger、行為等價（都會把 updated_at 改成 now()）
-- 但 trigger fire 兩次是雙倍 IO + 競爭。按 ERP 既有命名慣例
-- (`update_{table}_updated_at`、見 attractions/companies/customers/orders/tours)
-- 保留合慣例那條、砍另一條。
--
-- 不做：
--   - 不換留下那條 trigger 的 function（仍用 update_updated_at_column）
--     原因：update_updated_at_column 被憲法 §16 凍結模組仍用、
--     全面收斂到 set_updated_at 需等凍結解除、屬未來 task。
-- ============================================================================

-- payment_requests: 保留 update_payment_requests_updated_at
DROP TRIGGER IF EXISTS trigger_payment_requests_updated_at ON public.payment_requests;

-- suppliers: 保留 update_suppliers_updated_at
DROP TRIGGER IF EXISTS suppliers_updated_at_trigger ON public.suppliers;
