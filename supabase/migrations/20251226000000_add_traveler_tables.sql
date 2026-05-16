-- ============================================================================
-- Migration: 新增旅客系統表格
-- 日期: 2025-12-26
-- 目的: 合併 Online 資料庫到 ERP，新增旅客專用表格
-- ============================================================================

-- ============================================================================
-- 1. traveler_profiles - 旅客個人資料
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本資料
  full_name text,
  display_name text,
  username text UNIQUE,
  avatar_url text,
  phone text,
  email text,
  bio text,
  location text,

  -- 身分驗證
  id_number text,                    -- 身分證字號（綁定後填入）
  id_verified_at timestamptz,        -- 身分證驗證時間

  -- 用戶分級：traveler → verified → member
  user_type text DEFAULT 'traveler'
    CHECK (user_type IN ('traveler', 'verified', 'member')),

  -- 會員資訊
  is_founding_member boolean DEFAULT false,
  member_number integer,
  member_level text DEFAULT 'basic'
    CHECK (member_level IN ('basic', 'silver', 'gold', 'platinum')),

  -- Profile 完整度
  is_profile_complete boolean DEFAULT false,

  -- 統計
  active_group_count integer DEFAULT 0,

  -- 關聯 ERP
  customer_id uuid,  -- 連結 ERP customers 表（稍後加 FK）

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_profiles_id_number
  ON traveler_profiles(id_number) WHERE id_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_profiles_user_type
  ON traveler_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_traveler_profiles_username
  ON traveler_profiles(username) WHERE username IS NOT NULL;

-- 更新時間 trigger
CREATE OR REPLACE FUNCTION update_traveler_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_traveler_profiles_updated_at ON traveler_profiles;
CREATE TRIGGER trigger_traveler_profiles_updated_at
  BEFORE UPDATE ON traveler_profiles
  FOR EACH ROW EXECUTE FUNCTION update_traveler_profiles_updated_at();

-- ============================================================================
-- 2. 用戶升級 Trigger：綁定身分證時自動檢查 ERP 訂單
-- ============================================================================
CREATE OR REPLACE FUNCTION check_member_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- 當身分證從 NULL 變成有值時
  IF NEW.id_number IS NOT NULL AND (OLD.id_number IS NULL OR OLD.id_number = '') THEN
    NEW.id_verified_at = now();

    -- 檢查 ERP order_members 是否有此身分證
    IF EXISTS (SELECT 1 FROM order_members WHERE id_number = NEW.id_number LIMIT 1) THEN
      NEW.user_type := 'member';
    ELSE
      NEW.user_type := 'verified';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_member_upgrade ON traveler_profiles;
CREATE TRIGGER trigger_check_member_upgrade
  BEFORE UPDATE ON traveler_profiles
  FOR EACH ROW EXECUTE FUNCTION check_member_upgrade();

-- ============================================================================
-- 3. traveler_trips - 旅客行程
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資料
  title text NOT NULL,
  description text,
  cover_image text,

  -- 日期
  start_date date,
  end_date date,

  -- 狀態
  status text DEFAULT 'planning'
    CHECK (status IN ('planning', 'upcoming', 'ongoing', 'completed', 'cancelled')),

  -- 設定
  default_currency text DEFAULT 'TWD',

  -- 建立者
  created_by uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  -- 關聯 ERP 團（可選）
  erp_tour_id uuid,  -- 連結 ERP tours 表
  tour_code text,    -- ERP 團號（方便查詢）

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_trips_created_by ON traveler_trips(created_by);
CREATE INDEX IF NOT EXISTS idx_traveler_trips_status ON traveler_trips(status);
CREATE INDEX IF NOT EXISTS idx_traveler_trips_erp_tour_id ON traveler_trips(erp_tour_id) WHERE erp_tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_trips_tour_code ON traveler_trips(tour_code) WHERE tour_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_trips_dates ON traveler_trips(start_date, end_date);

-- ============================================================================
-- 4. traveler_trip_members - 行程成員
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  trip_id uuid NOT NULL REFERENCES traveler_trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  -- 角色
  role text DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),

  -- 顯示名稱（可覆蓋 profile 的名稱）
  nickname text,

  joined_at timestamptz DEFAULT now(),

  UNIQUE(trip_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_trip_members_trip ON traveler_trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_traveler_trip_members_user ON traveler_trip_members(user_id);

-- ============================================================================
-- 5. traveler_trip_flights - 行程航班
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_trip_flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  trip_id uuid NOT NULL REFERENCES traveler_trips(id) ON DELETE CASCADE,

  -- 航班類型
  flight_type text DEFAULT 'outbound'
    CHECK (flight_type IN ('outbound', 'return', 'transit')),

  -- 航班資訊
  airline text,
  flight_no text,

  -- 出發
  departure_date date,
  departure_time time,
  departure_airport text,
  departure_airport_code text,

  -- 抵達
  arrival_date date,
  arrival_time time,
  arrival_airport text,
  arrival_airport_code text,

  -- 其他
  pnr text,
  ticket_number text,
  cabin_class text,

  -- 集合資訊
  meeting_time time,
  meeting_location text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_trip_flights_trip ON traveler_trip_flights(trip_id);

-- ============================================================================
-- 6. traveler_trip_accommodations - 行程住宿
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_trip_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  trip_id uuid NOT NULL REFERENCES traveler_trips(id) ON DELETE CASCADE,

  -- 住宿資訊
  name text NOT NULL,
  address text,
  phone text,

  -- 日期
  check_in_date date,
  check_out_date date,

  -- 房間
  room_type text,
  room_count integer DEFAULT 1,

  -- 預訂
  confirmation_number text,
  booking_platform text,

  -- 位置
  latitude double precision,
  longitude double precision,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_trip_accommodations_trip ON traveler_trip_accommodations(trip_id);

-- ============================================================================
-- 7. traveler_trip_invitations - 行程邀請
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  trip_id uuid NOT NULL REFERENCES traveler_trips(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  -- 邀請碼
  invite_code text NOT NULL UNIQUE,

  -- 狀態
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),

  -- 角色（加入後的角色）
  role text DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),

  -- 過期時間
  expires_at timestamptz DEFAULT (now() + interval '7 days'),

  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_trip_invitations_trip ON traveler_trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_traveler_trip_invitations_invitee ON traveler_trip_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_traveler_trip_invitations_code ON traveler_trip_invitations(invite_code);

-- ============================================================================
-- 8. traveler_expenses - 分帳費用
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯（二選一）
  trip_id uuid REFERENCES traveler_trips(id) ON DELETE CASCADE,
  split_group_id uuid,  -- 稍後加 FK

  -- 費用資訊
  title text NOT NULL,
  description text,
  category text DEFAULT 'other'
    CHECK (category IN ('transport', 'accommodation', 'food', 'ticket', 'shopping', 'insurance', 'other')),

  -- 金額
  amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'TWD',

  -- 付款者
  paid_by uuid NOT NULL REFERENCES traveler_profiles(id),

  -- 日期
  expense_date date DEFAULT CURRENT_DATE,

  -- 收據
  receipt_url text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_expenses_trip ON traveler_expenses(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_expenses_split_group ON traveler_expenses(split_group_id) WHERE split_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_expenses_paid_by ON traveler_expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_traveler_expenses_date ON traveler_expenses(expense_date);

-- ============================================================================
-- 9. traveler_expense_splits - 費用分攤
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  expense_id uuid NOT NULL REFERENCES traveler_expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  -- 分攤金額
  amount decimal(12, 2) NOT NULL,

  -- 是否已結算
  is_settled boolean DEFAULT false,
  settled_at timestamptz,

  UNIQUE(expense_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_expense_splits_expense ON traveler_expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_traveler_expense_splits_user ON traveler_expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_traveler_expense_splits_unsettled ON traveler_expense_splits(user_id, is_settled) WHERE is_settled = false;

-- ============================================================================
-- 10. traveler_settlements - 結算記錄
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯（二選一）
  trip_id uuid REFERENCES traveler_trips(id) ON DELETE CASCADE,
  split_group_id uuid,  -- 稍後加 FK

  -- 付款方向
  from_user uuid NOT NULL REFERENCES traveler_profiles(id),
  to_user uuid NOT NULL REFERENCES traveler_profiles(id),

  -- 金額
  amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'TWD',

  -- 狀態
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),

  -- 備註
  note text,

  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_settlements_trip ON traveler_settlements(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_settlements_split_group ON traveler_settlements(split_group_id) WHERE split_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_settlements_from ON traveler_settlements(from_user);
CREATE INDEX IF NOT EXISTS idx_traveler_settlements_to ON traveler_settlements(to_user);

-- ============================================================================
-- 11. traveler_split_groups - 分帳群組（獨立於行程）
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_split_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資料
  name text NOT NULL,
  description text,
  cover_image text,

  -- 可選關聯行程
  trip_id uuid REFERENCES traveler_trips(id) ON DELETE SET NULL,

  -- 設定
  default_currency text DEFAULT 'TWD',

  -- 建立者
  created_by uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_split_groups_created_by ON traveler_split_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_traveler_split_groups_trip ON traveler_split_groups(trip_id) WHERE trip_id IS NOT NULL;

-- 加入 FK 到 expenses 和 settlements
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_traveler_expenses_split_group') THEN
    ALTER TABLE traveler_expenses
      ADD CONSTRAINT fk_traveler_expenses_split_group
      FOREIGN KEY (split_group_id) REFERENCES traveler_split_groups(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_traveler_settlements_split_group') THEN
    ALTER TABLE traveler_settlements
      ADD CONSTRAINT fk_traveler_settlements_split_group
      FOREIGN KEY (split_group_id) REFERENCES traveler_split_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 12. traveler_split_group_members - 分帳群組成員
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_split_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id uuid NOT NULL REFERENCES traveler_split_groups(id) ON DELETE CASCADE,
  user_id uuid,  -- NULL 表示虛擬成員

  -- 角色
  role text DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),

  -- 顯示名稱
  display_name text,
  nickname text,

  -- 虛擬成員（不需要帳號）
  is_virtual boolean DEFAULT false,

  joined_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_split_group_members_group ON traveler_split_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_traveler_split_group_members_user ON traveler_split_group_members(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- 13. traveler_friends - 好友系統
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  -- 狀態
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),

  -- 邀請
  invite_code text,
  invite_message text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),

  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,

  -- 防止重複
  UNIQUE(user_id, friend_id),
  -- 防止自己加自己
  CHECK (user_id != friend_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_friends_user ON traveler_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_traveler_friends_friend ON traveler_friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_traveler_friends_status ON traveler_friends(status);
CREATE INDEX IF NOT EXISTS idx_traveler_friends_invite_code ON traveler_friends(invite_code) WHERE invite_code IS NOT NULL;

-- ============================================================================
-- 14. social_groups - 揪團功能
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資料
  title text NOT NULL,
  description text,
  cover_image text,

  -- 分類
  category text DEFAULT 'other'
    CHECK (category IN ('food', 'photo', 'outdoor', 'party', 'music', 'coffee', 'travel', 'other')),

  -- 地點
  location_name text,
  location_address text,
  latitude double precision,
  longitude double precision,

  -- 時間
  event_date date,
  start_time time,
  end_time time,

  -- 人數限制
  max_members integer,
  current_members integer DEFAULT 1,

  -- 限制
  gender_limit text CHECK (gender_limit IN ('all', 'male', 'female')),
  require_approval boolean DEFAULT false,
  is_private boolean DEFAULT false,

  -- 費用
  estimated_cost decimal(12, 2),

  -- 狀態
  status text DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'full', 'completed', 'cancelled')),

  -- 建立者
  created_by uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_social_groups_created_by ON social_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_social_groups_status ON social_groups(status);
CREATE INDEX IF NOT EXISTS idx_social_groups_category ON social_groups(category);
CREATE INDEX IF NOT EXISTS idx_social_groups_event_date ON social_groups(event_date);
-- 地理位置索引（使用簡單的 btree，PostGIS 不一定可用）
CREATE INDEX IF NOT EXISTS idx_social_groups_latitude ON social_groups(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_groups_longitude ON social_groups(longitude) WHERE longitude IS NOT NULL;

-- ============================================================================
-- 15. social_group_members - 揪團成員
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  -- 角色
  role text DEFAULT 'member'
    CHECK (role IN ('organizer', 'member')),

  -- 狀態
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  applied_at timestamptz DEFAULT now(),
  approved_at timestamptz,

  UNIQUE(group_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_social_group_members_group ON social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_user ON social_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_status ON social_group_members(status);

-- ============================================================================
-- 16. social_group_tags - 揪團標籤
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_group_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
  tag text NOT NULL,

  UNIQUE(group_id, tag)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_social_group_tags_group ON social_group_tags(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_tags_tag ON social_group_tags(tag);

-- ============================================================================
-- 17. traveler_badges - 旅客徽章
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,

  badge_type text NOT NULL
    CHECK (badge_type IN (
      'founding_member',    -- 創始會員
      'group_newbie',       -- 揪團新手
      'group_pro',          -- 揪團達人
      'popular_host',       -- 人氣主辦
      'trip_planner',       -- 行程規劃師
      'expense_tracker',    -- 帳務小幫手
      'early_bird',         -- 早鳥會員
      'social_butterfly',   -- 社交蝴蝶
      'verified_traveler'   -- 認證旅客
    )),

  metadata jsonb DEFAULT '{}',
  earned_at timestamptz DEFAULT now(),

  UNIQUE(user_id, badge_type)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_badges_user ON traveler_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_traveler_badges_type ON traveler_badges(badge_type);

-- ============================================================================
-- 18. 自動建立 Profile 函數（供前端呼叫）
-- 注意：auth.users trigger 需要透過 Supabase Dashboard 設定
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ensure_traveler_profile(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- 嘗試插入新 profile
  INSERT INTO traveler_profiles (id, email, full_name, avatar_url)
  VALUES (p_user_id, p_email, p_full_name, p_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, traveler_profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, traveler_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, traveler_profiles.avatar_url),
    updated_at = now()
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

-- 授權匿名和認證用戶呼叫
GRANT EXECUTE ON FUNCTION public.ensure_traveler_profile TO anon, authenticated;

-- ============================================================================
-- 完成
-- ============================================================================

COMMENT ON TABLE traveler_profiles IS '旅客個人資料（Online App 用戶）';
COMMENT ON TABLE traveler_trips IS '旅客自建行程';
COMMENT ON TABLE traveler_expenses IS '旅客分帳費用';
COMMENT ON TABLE traveler_split_groups IS '獨立分帳群組';
COMMENT ON TABLE social_groups IS '揪團活動';
COMMENT ON TABLE traveler_friends IS '好友關係';
COMMENT ON TABLE traveler_badges IS '旅客徽章';

-- Done
