-- ============================================================================
-- 砍掉舊版 LINE/FB/Meta chatbot + 客服整合 + 內部 AI 早期測試資料
-- ============================================================================
-- 背景：William 之前手推手捏寫過一輪 LINE + Meta chatbot、做錯了、
-- 要照新規格書（Venturo_ERP_AI_客服與內部AI規格書.md）砍掉重做。
-- 客戶資料（customers / customer_inquiries）一筆不動、只砍 LINE 綁定欄位。
--
-- William 拍板（2026-05-04）：
--   - 8 張表全 DROP（含 customer_service_conversations 80 筆 + ai_conversations 2 筆）
--   - customers DROP COLUMN line_user_id, line_linked_at（0 筆有值）
--   - workspace_attendance_settings DROP COLUMN enable_line_clock（LINE 打卡不該存在）
--
-- 關聯 code 已先在 Phase 1-3 砍除（13 個 API 路由 + lib/line + ai-chat + HR 設定 LINE 段落 + customer LINE 綁定 dialog + .env.example META_*）
-- type-check 已過綠（exit 0、零錯誤）
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP 8 張舊表（FK 順序：line_messages CASCADE 指向 line_conversations）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.line_messages CASCADE;
DROP TABLE IF EXISTS public.line_conversations CASCADE;
DROP TABLE IF EXISTS public.line_users CASCADE;
DROP TABLE IF EXISTS public.line_groups CASCADE;
DROP TABLE IF EXISTS public.customer_service_conversations CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.workspace_line_config CASCADE;
DROP TABLE IF EXISTS public.workspace_meta_config CASCADE;

-- ----------------------------------------------------------------------------
-- 2. ALTER customers 砍 LINE 綁定欄位（0 筆有值、純空欄）
-- ----------------------------------------------------------------------------
ALTER TABLE public.customers DROP COLUMN IF EXISTS line_user_id;
ALTER TABLE public.customers DROP COLUMN IF EXISTS line_linked_at;

-- ----------------------------------------------------------------------------
-- 3. ALTER workspace_attendance_settings 砍 LINE 打卡開關
-- ----------------------------------------------------------------------------
ALTER TABLE public.workspace_attendance_settings DROP COLUMN IF EXISTS enable_line_clock;

COMMIT;

-- ============================================================================
-- 驗證查詢（apply 後跑一次確認）
-- ============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public'
--   AND table_name IN ('line_conversations','line_messages','line_users','line_groups',
--                       'customer_service_conversations','ai_conversations',
--                       'workspace_line_config','workspace_meta_config');
-- 預期：0 rows
--
-- SELECT column_name FROM information_schema.columns WHERE table_schema='public'
--   AND ((table_name='customers' AND column_name IN ('line_user_id','line_linked_at'))
--    OR (table_name='workspace_attendance_settings' AND column_name='enable_line_clock'));
-- 預期：0 rows
