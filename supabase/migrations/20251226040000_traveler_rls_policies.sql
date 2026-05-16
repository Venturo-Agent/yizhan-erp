-- ============================================================================
-- Migration: 旅客表格 RLS 策略
-- 日期: 2025-12-26
-- 目的: 確保旅客只能存取自己的資料
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Helper Functions
-- ============================================================================

-- 檢查當前用戶是否為旅客
CREATE OR REPLACE FUNCTION public.is_traveler()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM traveler_profiles
    WHERE id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.is_traveler IS '檢查當前用戶是否為旅客（有 traveler_profiles 記錄）';

-- 檢查當前用戶是否為員工
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.is_employee IS '檢查當前用戶是否為員工（有 employees 記錄）';

-- 取得當前旅客的 ID
CREATE OR REPLACE FUNCTION public.get_current_traveler_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid();  -- traveler_profiles.id = auth.users.id
END;
$$;

COMMENT ON FUNCTION public.get_current_traveler_id IS '取得當前旅客的 ID';

-- ============================================================================
-- 2. 啟用旅客表格 RLS
-- ============================================================================

DO $$
DECLARE
  traveler_tables text[] := ARRAY[
    'traveler_profiles',
    'traveler_trips',
    'traveler_trip_members',
    'traveler_trip_flights',
    'traveler_trip_accommodations',
    'traveler_trip_invitations',
    'traveler_expenses',
    'traveler_expense_splits',
    'traveler_settlements',
    'traveler_split_groups',
    'traveler_split_group_members',
    'traveler_friends',
    'social_groups',
    'social_group_members',
    'traveler_tour_cache'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY traveler_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'Enabled RLS for: %', tbl;
    ELSE
      RAISE NOTICE 'Table does not exist, skipping: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. traveler_profiles - 個人資料
-- ============================================================================

DROP POLICY IF EXISTS "traveler_profiles_select" ON traveler_profiles;
DROP POLICY IF EXISTS "traveler_profiles_update" ON traveler_profiles;
DROP POLICY IF EXISTS "traveler_profiles_insert" ON traveler_profiles;

-- 旅客只能看自己 + 員工可看全部（領隊查詢用）
DROP POLICY IF EXISTS "traveler_profiles_select" ON traveler_profiles;
CREATE POLICY "traveler_profiles_select" ON traveler_profiles FOR SELECT
USING (
  id = auth.uid()
  OR is_employee()
  OR is_super_admin()
);

-- 只能修改自己
DROP POLICY IF EXISTS "traveler_profiles_update" ON traveler_profiles;
CREATE POLICY "traveler_profiles_update" ON traveler_profiles FOR UPDATE
USING (id = auth.uid());

-- 透過 trigger 自動建立，不需要手動 insert
DROP POLICY IF EXISTS "traveler_profiles_insert" ON traveler_profiles;
CREATE POLICY "traveler_profiles_insert" ON traveler_profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================================================
-- 4. traveler_trips - 旅客自建行程
-- ============================================================================

DROP POLICY IF EXISTS "traveler_trips_select" ON traveler_trips;
DROP POLICY IF EXISTS "traveler_trips_insert" ON traveler_trips;
DROP POLICY IF EXISTS "traveler_trips_update" ON traveler_trips;
DROP POLICY IF EXISTS "traveler_trips_delete" ON traveler_trips;

-- 自己的 + 被邀請的
DROP POLICY IF EXISTS "traveler_trips_select" ON traveler_trips;
CREATE POLICY "traveler_trips_select" ON traveler_trips FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM traveler_trip_members
    WHERE trip_id = traveler_trips.id
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "traveler_trips_insert" ON traveler_trips;
CREATE POLICY "traveler_trips_insert" ON traveler_trips FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "traveler_trips_update" ON traveler_trips;
CREATE POLICY "traveler_trips_update" ON traveler_trips FOR UPDATE
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "traveler_trips_delete" ON traveler_trips;
CREATE POLICY "traveler_trips_delete" ON traveler_trips FOR DELETE
USING (created_by = auth.uid());

-- ============================================================================
-- 5. traveler_trip_members - 行程成員
-- ============================================================================

DROP POLICY IF EXISTS "traveler_trip_members_select" ON traveler_trip_members;
DROP POLICY IF EXISTS "traveler_trip_members_insert" ON traveler_trip_members;
DROP POLICY IF EXISTS "traveler_trip_members_delete" ON traveler_trip_members;

-- 只有行程擁有者和成員可看
DROP POLICY IF EXISTS "traveler_trip_members_select" ON traveler_trip_members;
CREATE POLICY "traveler_trip_members_select" ON traveler_trip_members FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM traveler_trips
    WHERE id = traveler_trip_members.trip_id
    AND created_by = auth.uid()
  )
);

-- 行程擁有者可新增
DROP POLICY IF EXISTS "traveler_trip_members_insert" ON traveler_trip_members;
CREATE POLICY "traveler_trip_members_insert" ON traveler_trip_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM traveler_trips
    WHERE id = trip_id
    AND created_by = auth.uid()
  )
);

-- 行程擁有者可刪除
DROP POLICY IF EXISTS "traveler_trip_members_delete" ON traveler_trip_members;
CREATE POLICY "traveler_trip_members_delete" ON traveler_trip_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM traveler_trips
    WHERE id = trip_id
    AND created_by = auth.uid()
  )
);

-- ============================================================================
-- 6. traveler_trip_flights / accommodations / invitations
-- ============================================================================

-- 航班
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_trip_flights') THEN
    DROP POLICY IF EXISTS "traveler_trip_flights_all" ON traveler_trip_flights;

    CREATE POLICY "traveler_trip_flights_all" ON traveler_trip_flights FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM traveler_trips
        WHERE id = traveler_trip_flights.trip_id
        AND created_by = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM traveler_trips
        WHERE id = trip_id
        AND created_by = auth.uid()
      )
    );
  END IF;
END $$;

-- 住宿
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_trip_accommodations') THEN
    DROP POLICY IF EXISTS "traveler_trip_accommodations_all" ON traveler_trip_accommodations;

    CREATE POLICY "traveler_trip_accommodations_all" ON traveler_trip_accommodations FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM traveler_trips
        WHERE id = traveler_trip_accommodations.trip_id
        AND created_by = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM traveler_trips
        WHERE id = trip_id
        AND created_by = auth.uid()
      )
    );
  END IF;
END $$;

-- 邀請
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_trip_invitations') THEN
    DROP POLICY IF EXISTS "traveler_trip_invitations_select" ON traveler_trip_invitations;
    DROP POLICY IF EXISTS "traveler_trip_invitations_insert" ON traveler_trip_invitations;
    DROP POLICY IF EXISTS "traveler_trip_invitations_update" ON traveler_trip_invitations;

    -- 被邀請者和行程擁有者可看
    CREATE POLICY "traveler_trip_invitations_select" ON traveler_trip_invitations FOR SELECT
    USING (
      invitee_id = auth.uid()
      OR inviter_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM traveler_trips
        WHERE id = traveler_trip_invitations.trip_id
        AND created_by = auth.uid()
      )
    );

    -- 行程擁有者可發送邀請
    CREATE POLICY "traveler_trip_invitations_insert" ON traveler_trip_invitations FOR INSERT
    WITH CHECK (
      inviter_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM traveler_trips
        WHERE id = trip_id
        AND created_by = auth.uid()
      )
    );

    -- 被邀請者可更新狀態
    CREATE POLICY "traveler_trip_invitations_update" ON traveler_trip_invitations FOR UPDATE
    USING (invitee_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 7. 分帳相關表格
-- ============================================================================

-- traveler_expenses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_expenses') THEN
    DROP POLICY IF EXISTS "traveler_expenses_all" ON traveler_expenses;

    -- 群組成員可存取
    CREATE POLICY "traveler_expenses_all" ON traveler_expenses FOR ALL
    USING (
      paid_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM traveler_split_group_members
        WHERE group_id = traveler_expenses.split_group_id
        AND user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- traveler_expense_splits
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_expense_splits') THEN
    DROP POLICY IF EXISTS "traveler_expense_splits_all" ON traveler_expense_splits;

    CREATE POLICY "traveler_expense_splits_all" ON traveler_expense_splits FOR ALL
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM traveler_expenses e
        JOIN traveler_split_group_members m ON m.group_id = e.split_group_id
        WHERE e.id = traveler_expense_splits.expense_id
        AND m.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- traveler_settlements
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_settlements') THEN
    DROP POLICY IF EXISTS "traveler_settlements_all" ON traveler_settlements;

    CREATE POLICY "traveler_settlements_all" ON traveler_settlements FOR ALL
    USING (
      from_user = auth.uid()
      OR to_user = auth.uid()
    );
  END IF;
END $$;

-- traveler_split_groups
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_split_groups') THEN
    DROP POLICY IF EXISTS "traveler_split_groups_select" ON traveler_split_groups;
    DROP POLICY IF EXISTS "traveler_split_groups_insert" ON traveler_split_groups;
    DROP POLICY IF EXISTS "traveler_split_groups_update" ON traveler_split_groups;

    -- 成員可看
    CREATE POLICY "traveler_split_groups_select" ON traveler_split_groups FOR SELECT
    USING (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM traveler_split_group_members
        WHERE group_id = traveler_split_groups.id
        AND user_id = auth.uid()
      )
    );

    CREATE POLICY "traveler_split_groups_insert" ON traveler_split_groups FOR INSERT
    WITH CHECK (created_by = auth.uid());

    CREATE POLICY "traveler_split_groups_update" ON traveler_split_groups FOR UPDATE
    USING (created_by = auth.uid());
  END IF;
END $$;

-- traveler_split_group_members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_split_group_members') THEN
    DROP POLICY IF EXISTS "traveler_split_group_members_all" ON traveler_split_group_members;

    CREATE POLICY "traveler_split_group_members_all" ON traveler_split_group_members FOR ALL
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM traveler_split_groups
        WHERE id = traveler_split_group_members.group_id
        AND created_by = auth.uid()
      )
    );
  END IF;
END $$;

-- ============================================================================
-- 8. 社交相關表格
-- ============================================================================

-- traveler_friends
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'traveler_friends') THEN
    DROP POLICY IF EXISTS "traveler_friends_select" ON traveler_friends;
    DROP POLICY IF EXISTS "traveler_friends_insert" ON traveler_friends;
    DROP POLICY IF EXISTS "traveler_friends_update" ON traveler_friends;
    DROP POLICY IF EXISTS "traveler_friends_delete" ON traveler_friends;

    CREATE POLICY "traveler_friends_select" ON traveler_friends FOR SELECT
    USING (user_id = auth.uid() OR friend_id = auth.uid());

    CREATE POLICY "traveler_friends_insert" ON traveler_friends FOR INSERT
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY "traveler_friends_update" ON traveler_friends FOR UPDATE
    USING (user_id = auth.uid() OR friend_id = auth.uid());

    CREATE POLICY "traveler_friends_delete" ON traveler_friends FOR DELETE
    USING (user_id = auth.uid());
  END IF;
END $$;

-- social_groups
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'social_groups') THEN
    DROP POLICY IF EXISTS "social_groups_select" ON social_groups;
    DROP POLICY IF EXISTS "social_groups_insert" ON social_groups;
    DROP POLICY IF EXISTS "social_groups_update" ON social_groups;

    -- is_private = false 表示公開群組
    CREATE POLICY "social_groups_select" ON social_groups FOR SELECT
    USING (
      is_private = false
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM social_group_members
        WHERE group_id = social_groups.id
        AND user_id = auth.uid()
      )
    );

    CREATE POLICY "social_groups_insert" ON social_groups FOR INSERT
    WITH CHECK (created_by = auth.uid());

    CREATE POLICY "social_groups_update" ON social_groups FOR UPDATE
    USING (created_by = auth.uid());
  END IF;
END $$;

-- social_group_members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'social_group_members') THEN
    DROP POLICY IF EXISTS "social_group_members_select" ON social_group_members;
    DROP POLICY IF EXISTS "social_group_members_insert" ON social_group_members;
    DROP POLICY IF EXISTS "social_group_members_delete" ON social_group_members;

    CREATE POLICY "social_group_members_select" ON social_group_members FOR SELECT
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM social_groups
        WHERE id = social_group_members.group_id
        AND (created_by = auth.uid() OR is_private = false)
      )
    );

    -- 群組建立者可邀請 / 自己加入公開群組
    CREATE POLICY "social_group_members_insert" ON social_group_members FOR INSERT
    WITH CHECK (
      user_id = auth.uid()  -- 自己加入
      OR EXISTS (
        SELECT 1 FROM social_groups
        WHERE id = group_id
        AND created_by = auth.uid()  -- 群組建立者邀請
      )
    );

    CREATE POLICY "social_group_members_delete" ON social_group_members FOR DELETE
    USING (
      user_id = auth.uid()  -- 自己退出
      OR EXISTS (
        SELECT 1 FROM social_groups
        WHERE id = group_id
        AND created_by = auth.uid()  -- 群組建立者踢人
      )
    );
  END IF;
END $$;

-- ============================================================================
-- 9. traveler_tour_cache - ERP 行程快取
-- ============================================================================

DROP POLICY IF EXISTS "traveler_tour_cache_select" ON traveler_tour_cache;

-- 只能讀自己的快取 + 員工可全讀（管理用）
DROP POLICY IF EXISTS "traveler_tour_cache_select" ON traveler_tour_cache;
CREATE POLICY "traveler_tour_cache_select" ON traveler_tour_cache FOR SELECT
USING (
  traveler_id = auth.uid()
  OR is_employee()
  OR is_super_admin()
);

-- 快取由 trigger 維護，不開放直接寫入
-- INSERT/UPDATE/DELETE 只允許 service_role 或 trigger

-- ============================================================================
-- 10. 驗證結果
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename LIKE 'traveler%' OR tablename LIKE 'social%';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Traveler RLS Policies Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Traveler table policies: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Key Features:';
  RAISE NOTICE '  • 旅客只能存取自己的資料';
  RAISE NOTICE '  • 行程成員可看共同行程';
  RAISE NOTICE '  • 分帳群組成員可互相看';
  RAISE NOTICE '  • 員工可查看旅客資料（領隊功能）';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- 完成
-- ============================================================================

COMMIT;
