-- ════════════════════════════════════════════════════════════════════
-- 加 contracts.status CHECK constraint
--
-- 為什麼：
--   2026-05-15 SSOT 盤點、contracts.status 沒 CHECK
--   先在同次盤點擴 SSOT contract enum 為 draft/unsigned/signed/cancelled
--   再加 CHECK constraint 對齊
--
-- 注意：contracts.status 是 varchar、用 status::text 顯式轉 cast
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status::text = ANY (ARRAY['draft', 'unsigned', 'signed', 'cancelled']));

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
-- COMMIT;
