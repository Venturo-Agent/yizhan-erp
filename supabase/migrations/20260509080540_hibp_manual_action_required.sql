-- =============================================================================
-- HIBP（Have I Been Pwned）密碼洩漏比對 - 手動開啟提醒
-- 對應 SECURITY_AUDIT.md §10 #4（中風險、advisor: auth_leaked_password_protection）
-- =============================================================================
--
-- 此 migration 不執行任何 SQL（只是 placeholder + 提醒 William）。
-- HIBP 是 Supabase Auth 設定、無法用 SQL / MCP API 開啟、必須走 dashboard：
--
--   Supabase Dashboard
--   → Authentication
--   → Providers / Settings
--   → Password security
--   → 開啟「Leaked Password Protection (HaveIBeenPwned)」
--
-- 開啟後、user 設新密碼會比對 HIBP 資料庫、命中已洩漏密碼會被拒絕。
--
-- 開完 advisor `auth_leaked_password_protection` warning 會消失。
-- =============================================================================

SELECT 1; -- no-op、純註記
