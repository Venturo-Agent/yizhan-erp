-- ─────────────────────────────────────────────────────────────────────────────
-- Shared Data 整合：角落 81 條 attractions 併入公共池、由 capability 管
-- William 2026-05-13 拍板
--
-- 設計修正：上一條 migration（150000）把「漫途身份建的」設為公共池、
--   但 William 拍板：公共資料 = 不屬於任何 workspace = NULL、由
--   shared_data.X.write capability 管（守門員）、非 workspace。
--
-- 本 migration 做：
--   1. UPDATE 角落 81 條 attractions → created_by_workspace_id = NULL（併入公共）
--   2. Trigger 改：有 shared_data.X.write capability 的 user 建 → 保留 NULL；
--      沒 capability → 自動填當前 workspace（私池）
--   3. RLS 重寫：
--      - SELECT: 自己 workspace OR (NULL AND 有 shared_data_content feature)
--      - INSERT/UPDATE/DELETE: 自己 workspace OR (NULL AND 有 shared_data.X.write capability)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ 1. 一次性 data migration：角落 81 條 → NULL ════
UPDATE public.attractions
  SET created_by_workspace_id = NULL,
      created_by_user_id = NULL
  WHERE created_by_workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81';

-- ════ 2. Trigger function 改寫 ════
CREATE OR REPLACE FUNCTION public.set_shared_data_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap TEXT;
  v_has_cap BOOLEAN;
BEGIN
  -- 只在 client 沒指定時才動
  IF NEW.created_by_workspace_id IS NULL THEN
    -- 對應 capability code
    v_cap := 'shared_data.' || TG_TABLE_NAME || '.write';

    SELECT EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = (SELECT auth.uid())
        AND rc.capability_code = v_cap
        AND rc.enabled = true
    ) INTO v_has_cap;

    IF v_has_cap THEN
      -- 有 capability：保留 NULL（公共資料）
      NEW.created_by_workspace_id := NULL;
    ELSE
      -- 沒 capability：自動填當前 workspace（私池）
      NEW.created_by_workspace_id := public.get_current_user_workspace();
    END IF;
  END IF;

  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := (SELECT auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

-- ════ 3. RLS 重寫 attractions / hotels / restaurants ════
DO $$
DECLARE
  tbl TEXT;
  v_cap TEXT;
  v_select TEXT;
  v_write TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['attractions', 'hotels', 'restaurants'])
  LOOP
    v_cap := 'shared_data.' || tbl || '.write';

    -- 砍舊 policies
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', tbl, tbl);

    -- SELECT: 自己 workspace 的 OR (公共池 NULL AND 有 feature)
    v_select := $q$
      created_by_workspace_id = public.get_current_user_workspace()
      OR (
        created_by_workspace_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.workspace_features wf
          WHERE wf.workspace_id = public.get_current_user_workspace()
            AND wf.feature_code = 'shared_data_content'
            AND wf.enabled = true
        )
      )
    $q$;
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (%s)',
                   tbl, tbl, v_select);

    -- WRITE: 自己 workspace OR (NULL 公共池 AND 有 shared_data.X.write capability)
    v_write := format($q$
      created_by_workspace_id = public.get_current_user_workspace()
      OR (
        created_by_workspace_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.employees e
          JOIN public.role_capabilities rc ON rc.role_id = e.role_id
          WHERE e.user_id = (SELECT auth.uid())
            AND rc.capability_code = %L
            AND rc.enabled = true
        )
      )
    $q$, v_cap);

    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
                   tbl, tbl, v_write);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                   tbl, tbl, v_write, v_write);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING (%s)',
                   tbl, tbl, v_write);

    RAISE NOTICE '✓ % policies rebuilt', tbl;
  END LOOP;
END $$;

-- ════ 完工驗證 ════
DO $$
DECLARE
  v_pol_count int;
  v_corner_remaining int;
BEGIN
  SELECT count(*) INTO v_pol_count FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('attractions', 'hotels', 'restaurants')
      AND policyname ~ '_(select|insert|update|delete)$';
  IF v_pol_count <> 12 THEN
    RAISE EXCEPTION 'Policies 沒建齊、count = % (expect 12)', v_pol_count;
  END IF;

  SELECT count(*) INTO v_corner_remaining FROM public.attractions
    WHERE created_by_workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81';
  IF v_corner_remaining > 0 THEN
    RAISE EXCEPTION '角落 attractions 還有 % 條沒清乾淨', v_corner_remaining;
  END IF;

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✓ Shared data 公共池整合完成';
  RAISE NOTICE '  - 12 policies（自己 workspace + 公共池守 capability）';
  RAISE NOTICE '  - 81 條角落 attractions 已併入公共池';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;
