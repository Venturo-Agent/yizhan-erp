-- ─────────────────────────────────────────────────────────────────────────────
-- member_flights — 團員航班資訊（PNR 解析後儲存）
-- 2026-05-14 William 拍板 A：解 PNR 後存 DB、帳單 Dialog 可帶入飛機資訊
--
-- 設計：
--   - 一個 member 可有多 segment（去程 / 回程 / 中轉、各一 row）
--   - 對應 PNR parser 的 FlightSegment（src/lib/pnr-parser/types.ts:123）
--   - UNIQUE(member_id, segment_index)
--   - workspace_scoped RLS、跟 order_members 同 scope
--
-- Phase 1（這個 migration）：建表 + RLS
-- Phase 2（之後）：PnrMatchDialog 儲存時寫入
-- Phase 3（之後）：CreateInvoicesDialog 的 ✈️ 按鈕撈出來帶入說明
--
-- Rollback: 見末尾
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.member_flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),

  -- 關聯（member 刪了航班跟著刪）
  member_id uuid NOT NULL REFERENCES public.order_members(id) ON DELETE CASCADE,
  segment_index int NOT NULL CHECK (segment_index >= 0),

  -- 對應 PNR FlightSegment
  airline text,                  -- CI / BR / NH
  flight_number text,            -- CI100 / BR189
  departure_date date,           -- 2026-06-20
  departure_time text,           -- 14:30（HH:MM）
  arrival_time text,             -- 18:00
  origin text,                   -- TPE（IATA code）
  destination text,              -- NRT
  cabin_class text,              -- Y / W / J / F
  aircraft text,                 -- 333 / 77W
  status text,                   -- HK / KK / TK / DK
  meal text,                     -- 飛機餐 M / L / 無

  -- 審計（紅線 B：FK → employees）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(member_id, segment_index)
);

CREATE INDEX IF NOT EXISTS idx_member_flights_workspace ON public.member_flights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_member_flights_member ON public.member_flights(member_id);
CREATE INDEX IF NOT EXISTS idx_member_flights_departure_date ON public.member_flights(departure_date);

COMMENT ON TABLE public.member_flights IS '團員航班資訊、PNR 解析後存進來、Dialog ✈️ 帶入時撈出來';
COMMENT ON COLUMN public.member_flights.segment_index IS '航段順序、0 起、譬如 去程=0 中轉=1 回程=2';

-- RLS：standard workspace_scoped
ALTER TABLE public.member_flights ENABLE ROW LEVEL SECURITY;
-- ⚠️ 不准 FORCE（紅線 A）

DROP POLICY IF EXISTS "member_flights_select_authenticated" ON public.member_flights;
CREATE POLICY "member_flights_select_authenticated" ON public.member_flights
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "member_flights_insert_authenticated" ON public.member_flights;
CREATE POLICY "member_flights_insert_authenticated" ON public.member_flights
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "member_flights_update_authenticated" ON public.member_flights;
CREATE POLICY "member_flights_update_authenticated" ON public.member_flights
  FOR UPDATE TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "member_flights_delete_authenticated" ON public.member_flights;
CREATE POLICY "member_flights_delete_authenticated" ON public.member_flights
  FOR DELETE TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- auto update updated_at
DROP TRIGGER IF EXISTS set_member_flights_updated_at ON public.member_flights;
CREATE TRIGGER set_member_flights_updated_at
  BEFORE UPDATE ON public.member_flights
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 驗證
DO $$
DECLARE
  v_table int;
  v_policy int;
BEGIN
  SELECT count(*) INTO v_table FROM information_schema.tables
  WHERE table_schema='public' AND table_name='member_flights';
  IF v_table = 0 THEN RAISE EXCEPTION 'member_flights 表沒建出來'; END IF;

  SELECT count(*) INTO v_policy FROM pg_policies WHERE tablename='member_flights';
  IF v_policy < 4 THEN
    RAISE EXCEPTION 'RLS policy 數不對、預期 4、實際 %', v_policy;
  END IF;

  RAISE NOTICE '✓ member_flights 表 + 4 RLS policy 都建好';
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS set_member_flights_updated_at ON public.member_flights;
-- DROP TABLE IF EXISTS public.member_flights CASCADE;
-- COMMIT;
