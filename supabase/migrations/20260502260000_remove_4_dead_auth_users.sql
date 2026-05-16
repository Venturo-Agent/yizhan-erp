-- ============================================================
-- 2026-05-02 砍 4 個死帳號
--
-- 背景：H1 task 砍 get_current_user_workspace 的 raw_user_meta_data fallback
-- 後揭露：4 個 auth.users 從來沒在 employees 建檔、之前靠 escape hatch 登入。
--
-- William 拍板砍：
--   - corner_yaping@venturo.com（CORNER ws、2026-03-10 後沒登入）
--   - corner_liao00@venturo.com（同上）
--   - emma@gmail.com（workspace 已不存在、孤兒）
--   - demowang@gmail.com（同上）
--
-- 影響：
--   - 0 個 employees row 受影響（全部 has_employee=false）
--   - 2 個 sessions / 2 個 refresh_tokens 隨 FK cascade 清除
-- ============================================================

DELETE FROM auth.users
WHERE email IN (
  'corner_yaping@venturo.com',
  'corner_liao00@venturo.com',
  'emma@gmail.com',
  'demowang@gmail.com'
);
