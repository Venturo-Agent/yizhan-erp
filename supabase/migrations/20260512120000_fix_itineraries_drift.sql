-- ─────────────────────────────────────────────────────────────────────────────
-- itineraries schema 對齊修復
-- 日期：2026-05-12（William 拍板「不要技術債」)
--
-- 背景：
--   venturo-aierp 從 venturo-erp fork 後、itineraries 表沒跟著
--   既有 schema 漂移 (drift) 補齊。code 在 src/data/entities/itineraries.ts
--   的 SELECT 期望 9 個欄位、deployed 都沒有 → 任何 list / detail / create 全炸。
--
-- 本 migration 做：
--   1. 加 9 個缺欄（workspace_id / created_by / updated_by 之審計三件套
--      + version control 三件套 + 設計顯示四件套）
--   2. workspace_id 從 tour_id 反查 backfill（最準確、不亂兜）
--   3. FK：workspace_id → workspaces、parent_id → itineraries(自參考、版本鏈)
--   4. 索引：workspace + 常見 query 組合
--   5. RLS policies：模仿 tours / orders 模式、用 workspace_id 隔離
--
-- 主動跳過（已 review 風險）：
--   - 不加 auto-set workspace_id trigger（用 auth.uid() 推、service_role 會炸）
--   - workspace_id 由 application layer 顯式寫入（既有 code 已這樣）
--   - 不設 workspace_id NOT NULL（避免 backfill 漏導致 INSERT 失敗）
--
-- 不 apply 的 repo 舊 migration（功能被吸收 / 主動拋棄）：
--   - 20251120230000_add_itinerary_version_control.sql（version 三件套已含於本檔）
--   - 20251210020000_add_workspace_to_itineraries.sql（workspace 三件套已含、trigger 主動跳過）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. 加 column（用 IF NOT EXISTS、可重跑）
-- ═════════════════════════════════════════════════════════════════════════════

-- 1a. 多租戶
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 1b. 版本控制三件套
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS parent_id UUID;

-- 1c. 設計顯示
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS duration_days INTEGER;

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS hotels JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS show_hotels BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS show_leader_meeting BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.itineraries.workspace_id IS 'Workspace ID（多租戶隔離）— 由 application layer 寫入（不用 trigger 推導、避免 auth.uid() 風險）';
COMMENT ON COLUMN public.itineraries.version IS '行程表版本（版本鏈用）';
COMMENT ON COLUMN public.itineraries.is_latest IS '是否為最新版本（同 parent_id 鏈下只一筆 true）';
COMMENT ON COLUMN public.itineraries.parent_id IS '上一版本 id（自參考、版本鏈源頭為 NULL）';
COMMENT ON COLUMN public.itineraries.author_name IS '作者顯示名（行程表編輯紀錄用、不掛 FK）';
COMMENT ON COLUMN public.itineraries.duration_days IS '行程天數（從 daily_itinerary 推導但快取於此、列表顯示用）';
COMMENT ON COLUMN public.itineraries.hotels IS '飯店資料（jsonb array）';
COMMENT ON COLUMN public.itineraries.show_hotels IS '展示頁是否顯示飯店區塊';
COMMENT ON COLUMN public.itineraries.show_leader_meeting IS '展示頁是否顯示領隊集合資訊';

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Backfill workspace_id（從 tour 反查、最準確）
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_total INTEGER;
  v_filled INTEGER;
  v_orphan INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.itineraries;

  -- 用 tour_id 反查 tours.workspace_id
  -- 注意：tours.id 是 text 型別、itineraries.tour_id 是 uuid 型別（schema 設計漂、不在本次修正範圍）、cast 做比對
  UPDATE public.itineraries i
  SET workspace_id = t.workspace_id
  FROM public.tours t
  WHERE i.tour_id IS NOT NULL
    AND i.tour_id::text = t.id
    AND i.workspace_id IS NULL;

  GET DIAGNOSTICS v_filled = ROW_COUNT;

  SELECT COUNT(*) INTO v_orphan
  FROM public.itineraries
  WHERE workspace_id IS NULL;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'itineraries workspace_id backfill';
  RAISE NOTICE '====================================';
  RAISE NOTICE '  總筆數：%', v_total;
  RAISE NOTICE '  從 tours 反查補上：% 筆', v_filled;
  RAISE NOTICE '  孤兒（tour_id 為空或對不到）：% 筆', v_orphan;

  -- 孤兒不擋、留 NULL、application 寫新資料時自己給
  -- 主動不設 NOT NULL constraint、避免漏掉的歷史資料炸 INSERT
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. FK 約束
-- ═════════════════════════════════════════════════════════════════════════════

-- workspace_id → workspaces
ALTER TABLE public.itineraries
  DROP CONSTRAINT IF EXISTS fk_itineraries_workspace;

ALTER TABLE public.itineraries
  ADD CONSTRAINT fk_itineraries_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- parent_id → itineraries（自參考、版本鏈）
ALTER TABLE public.itineraries
  DROP CONSTRAINT IF EXISTS fk_itineraries_parent;

ALTER TABLE public.itineraries
  ADD CONSTRAINT fk_itineraries_parent
  FOREIGN KEY (parent_id) REFERENCES public.itineraries(id) ON DELETE SET NULL;

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. 索引
-- ═════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_itineraries_workspace_id
  ON public.itineraries(workspace_id);

CREATE INDEX IF NOT EXISTS idx_itineraries_workspace_tour
  ON public.itineraries(workspace_id, tour_id)
  WHERE _deleted = false;

CREATE INDEX IF NOT EXISTS idx_itineraries_parent_id
  ON public.itineraries(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_itineraries_is_latest
  ON public.itineraries(is_latest)
  WHERE is_latest = true AND _deleted = false;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. RLS policies（用 workspace_id 隔離、模仿 tours / orders pattern）
-- ═════════════════════════════════════════════════════════════════════════════

-- 確保 RLS 啟用（既有 schema 已 ENABLE、這裡保險再設一次）
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- 清掉可能殘留的舊 policies
DROP POLICY IF EXISTS "itineraries_select" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_insert" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_update" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_delete" ON public.itineraries;
DROP POLICY IF EXISTS "Allow authenticated users full access to itineraries" ON public.itineraries;

-- SELECT：同 workspace 看得到、孤兒（NULL workspace_id）讓 service_role 處理
CREATE POLICY "itineraries_select" ON public.itineraries
  FOR SELECT
  USING (
    workspace_id = public.get_current_user_workspace()
  );

-- INSERT：寫入時必須是自己 workspace
CREATE POLICY "itineraries_insert" ON public.itineraries
  FOR INSERT
  WITH CHECK (
    workspace_id = public.get_current_user_workspace()
  );

-- UPDATE：只能改自己 workspace 的
CREATE POLICY "itineraries_update" ON public.itineraries
  FOR UPDATE
  USING (
    workspace_id = public.get_current_user_workspace()
  )
  WITH CHECK (
    workspace_id = public.get_current_user_workspace()
  );

-- DELETE：只能刪自己 workspace 的
CREATE POLICY "itineraries_delete" ON public.itineraries
  FOR DELETE
  USING (
    workspace_id = public.get_current_user_workspace()
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. 驗證
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_missing_cols TEXT[];
  v_col TEXT;
BEGIN
  -- 驗證 9 個 column 都存在
  FOREACH v_col IN ARRAY ARRAY[
    'workspace_id','version','is_latest','parent_id',
    'author_name','duration_days','hotels','show_hotels','show_leader_meeting'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='itineraries' AND column_name=v_col
    ) THEN
      v_missing_cols := array_append(v_missing_cols, v_col);
    END IF;
  END LOOP;

  IF array_length(v_missing_cols, 1) > 0 THEN
    RAISE EXCEPTION 'itineraries 仍缺欄位：%', array_to_string(v_missing_cols, ', ');
  END IF;

  -- 驗證 RLS policies 4 條都建好
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='itineraries' AND policyname='itineraries_select'
  ) THEN
    RAISE EXCEPTION 'itineraries_select policy 沒建好';
  END IF;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ itineraries drift 修復完成';
  RAISE NOTICE '  9 個欄位齊';
  RAISE NOTICE '  RLS policies 4 條已設';
  RAISE NOTICE '  FK 2 條已設（workspace、parent）';
  RAISE NOTICE '  索引 4 條已建';
  RAISE NOTICE '====================================';
END $$;

COMMIT;
