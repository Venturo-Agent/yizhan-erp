-- ─────────────────────────────────────────────────────────────────────────────
-- Phase A0: 補建 tours.controller_id 欄位
--
-- 背景：歷史 migration `20260108100000_add_controller_to_tours.sql` 在 venturo-erp
--   時代寫過 ADD COLUMN、但 venturo-aierp（agency@venturo.tw 帳號）的 Supabase
--   project 從未跑過這條 migration、實際 DB 沒有這欄位。
--
-- A2 的 scope_visible / A4 的 NOT NULL 都依賴此欄位、必須先補。
--
-- 風險：低 — IF NOT EXISTS 守、純 schema add、欄位 nullable、不影響既有資料。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS controller_id UUID
    REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tours_controller_id
  ON public.tours (controller_id)
  WHERE controller_id IS NOT NULL;

COMMENT ON COLUMN public.tours.controller_id IS
  '團控 — 控整團的負責人 employee.id。A0 補欄位（A4 改 NOT NULL）。';

COMMIT;
