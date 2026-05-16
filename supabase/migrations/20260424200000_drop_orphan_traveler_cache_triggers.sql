-- =============================================
-- Migration: 砍 2025-12-26 traveler-profiles 系統的孤兒 trigger/function
-- Date: 2026-04-24
--
-- 背景：
--   2025-12-26 做了「旅客資料中心」功能（跨 workspace 累積客人歷史）
--   相關表：traveler_profiles / traveler_tour_cache
--   相關 triggers: trigger_order_member_cache + trigger_add_travelers_to_conversation
--   相關 functions: auto_refresh_traveler_cache / refresh_traveler_tour_cache 等 7 個
--
--   2026-04-22 大掃除把 traveler_profiles 表砍了（功能太前衛先不要）
--   但這批 trigger + function 沒跟著清
--   結果：UPDATE order_members 會炸「relation "traveler_profiles" does not exist」
--   （Supabase client 可能吃掉 error、所以 app 層看不見）
--
-- 這個 migration：把整批孤兒 trigger + function 砍乾淨。
-- =============================================

BEGIN;

-- 1. 砍 triggers（先、才能砍 functions 不被依賴擋）
DROP TRIGGER IF EXISTS trigger_order_member_cache ON public.order_members;
DROP TRIGGER IF EXISTS trigger_add_travelers_to_conversation ON public.orders;

-- 2. 砍 functions（CASCADE 清掉任何潛在依賴；簽章要精確 match 才會 drop）
DROP FUNCTION IF EXISTS public.auto_refresh_traveler_cache() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_traveler_tour_cache(p_traveler_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.add_travelers_to_tour_conversation() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_traveler_profile(p_user_id uuid, p_email text, p_full_name text, p_avatar_url text) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_traveler_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_traveler() CASCADE;
DROP FUNCTION IF EXISTS public.update_traveler_profiles_updated_at() CASCADE;

-- 3. 驗證孤兒已全砍
DO $$
DECLARE
  tg_count int;
  fn_count int;
BEGIN
  SELECT count(*) INTO tg_count
  FROM pg_trigger
  WHERE tgname IN ('trigger_order_member_cache', 'trigger_add_travelers_to_conversation');

  SELECT count(*) INTO fn_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN (
      'auto_refresh_traveler_cache',
      'refresh_traveler_tour_cache',
      'add_travelers_to_tour_conversation',
      'ensure_traveler_profile',
      'get_current_traveler_id',
      'is_traveler',
      'update_traveler_profiles_updated_at'
    );

  IF tg_count > 0 THEN RAISE EXCEPTION '孤兒 trigger 還有 % 個沒清', tg_count; END IF;
  IF fn_count > 0 THEN RAISE EXCEPTION '孤兒 function 還有 % 個沒清', fn_count; END IF;
END $$;

COMMIT;
