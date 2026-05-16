-- ─────────────────────────────────────────────────────────────────────────────
-- Shared Data 改設計：每 workspace 自己景點庫 + 公共池買賣（William 2026-05-13 拍板）
--
-- 取代 5/11 那條「漫途獨家管」的設計、改成：
--   - 每 workspace 自己建自己景點（attractions/hotels/restaurants）、私池
--   - 漫途的 workspace 建的 + 歷史 NULL = 公共池
--   - 客戶買 shared_data_content feature → 多看公共池
--
-- 本 migration 做：
--   1. Trigger BEFORE INSERT 自動填 created_by_workspace_id + created_by_user_id
--   2. RLS 改寫：SELECT 自己 OR 公共池（有 feature）、INSERT/UPDATE/DELETE 只能自己
--   3. 角落 workspace 啟用 shared_data_content（讓 William 立刻能看漫途歷史 983 條）
--
-- 設計來源：2026-05-13 cctk 對話 William 拍板
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ 1. Trigger function：auto-fill created_by_workspace_id ════
CREATE OR REPLACE FUNCTION public.set_shared_data_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_workspace_id IS NULL THEN
    NEW.created_by_workspace_id := public.get_current_user_workspace();
  END IF;
  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_shared_data_created_by() IS
  'Auto-fill created_by_workspace_id + created_by_user_id on shared-data inserts (attractions/hotels/restaurants).';

-- Attach trigger to 3 tables
DROP TRIGGER IF EXISTS trg_attractions_set_created_by ON public.attractions;
CREATE TRIGGER trg_attractions_set_created_by
  BEFORE INSERT ON public.attractions
  FOR EACH ROW EXECUTE FUNCTION public.set_shared_data_created_by();

DROP TRIGGER IF EXISTS trg_hotels_set_created_by ON public.hotels;
CREATE TRIGGER trg_hotels_set_created_by
  BEFORE INSERT ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.set_shared_data_created_by();

DROP TRIGGER IF EXISTS trg_restaurants_set_created_by ON public.restaurants;
CREATE TRIGGER trg_restaurants_set_created_by
  BEFORE INSERT ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_shared_data_created_by();

-- ════ 2. RLS 改寫 attractions / hotels / restaurants ════
-- 漫途 workspace_id = b2222222-2222-2222-2222-222222222222
DO $$
DECLARE
  tbl TEXT;
  v_select TEXT;
  v_write TEXT;
  v_venturo_wid CONSTANT TEXT := 'b2222222-2222-2222-2222-222222222222';
BEGIN
  v_write := 'created_by_workspace_id = public.get_current_user_workspace()';

  v_select := format($q$
    created_by_workspace_id = public.get_current_user_workspace()
    OR (
      (created_by_workspace_id IS NULL OR created_by_workspace_id = %L::uuid)
      AND EXISTS (
        SELECT 1 FROM public.workspace_features wf
        WHERE wf.workspace_id = public.get_current_user_workspace()
          AND wf.feature_code = 'shared_data_content'
          AND wf.enabled = true
      )
    )
  $q$, v_venturo_wid);

  FOR tbl IN SELECT unnest(ARRAY['attractions', 'hotels', 'restaurants'])
  LOOP
    -- 砍舊 policies（不管什麼命名都砍）
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', tbl, tbl);

    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (%s)',
                   tbl, tbl, v_select);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
                   tbl, tbl, v_write);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                   tbl, tbl, v_write, v_write);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING (%s)',
                   tbl, tbl, v_write);

    RAISE NOTICE '✓ % policies rebuilt (4)', tbl;
  END LOOP;
END $$;

-- ════ 3. 角落 workspace 啟用 shared_data_content feature ════
-- 角落 workspace_id = a89335d4-85f1-492b-83c7-2476ab7c5d81
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
VALUES ('a89335d4-85f1-492b-83c7-2476ab7c5d81', 'shared_data_content', true)
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

-- ════ 完工驗證 ════
DO $$
DECLARE
  v_trg_count int;
  v_pol_count int;
BEGIN
  SELECT count(*) INTO v_trg_count FROM pg_trigger
    WHERE tgname IN ('trg_attractions_set_created_by', 'trg_hotels_set_created_by', 'trg_restaurants_set_created_by');
  IF v_trg_count <> 3 THEN
    RAISE EXCEPTION 'Triggers 沒建齊、count = %', v_trg_count;
  END IF;

  SELECT count(*) INTO v_pol_count FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('attractions', 'hotels', 'restaurants')
      AND policyname ~ '_(select|insert|update|delete)$';
  IF v_pol_count <> 12 THEN
    RAISE EXCEPTION 'Policies 沒建齊、count = % (expect 12)', v_pol_count;
  END IF;

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✓ Shared data per-workspace isolation 完成';
  RAISE NOTICE '  - 3 triggers + 12 policies';
  RAISE NOTICE '  - 角落 workspace 啟用 shared_data_content';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;
