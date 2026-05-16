-- 給現有用戶頒發創始測試會員徽章
BEGIN;

-- 1. 建立 badges 表（如果不存在）
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#C9A961',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 刪除舊的 user_badges 表（如果存在且 user_id 是 UUID 類型）
DROP TABLE IF EXISTS user_badges;

-- 3. 建立 user_badges 表（profiles.id 是 UUID 類型）
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- 4. 新增 is_beta_tester 欄位到 profiles（如果不存在）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false;

-- 5. 建立創始測試會員徽章（如果不存在）
INSERT INTO badges (code, name, description, icon, color, category)
VALUES ('founder_beta', '創始測試會員', '感謝您成為 Venturo 的早期測試用戶！', 'star', '#FFD700', 'achievement')
ON CONFLICT (code) DO NOTHING;

-- 6. 頒發徽章給所有現有用戶
DO $$
DECLARE
  founder_badge_id UUID;
BEGIN
  SELECT id INTO founder_badge_id FROM badges WHERE code = 'founder_beta';

  IF founder_badge_id IS NOT NULL THEN
    -- 給所有現有用戶頒發徽章
    INSERT INTO user_badges (user_id, badge_id)
    SELECT p.id, founder_badge_id
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = p.id AND ub.badge_id = founder_badge_id
    );

    -- 標記所有現有用戶為 beta tester
    UPDATE profiles SET is_beta_tester = true WHERE is_beta_tester IS NULL OR is_beta_tester = false;
  END IF;
END $$;

COMMIT;
