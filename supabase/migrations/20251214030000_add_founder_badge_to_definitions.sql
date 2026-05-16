-- 將創始測試會員徽章加入 badge_definitions 表
BEGIN;

-- 1. 在 badge_definitions 加入創始測試會員徽章
INSERT INTO badge_definitions (id, name, description, icon_url, category, points_reward, is_active, sort_order)
VALUES (
  'FOUNDER_BETA',
  '創始測試會員',
  '感謝您成為 Venturo 的早期測試用戶！',
  '/icons/badges/founder-star.svg',
  'achievement',
  0,
  true,
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url;

COMMIT;
