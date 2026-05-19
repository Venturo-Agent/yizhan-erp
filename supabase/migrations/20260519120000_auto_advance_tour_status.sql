-- ════════════════════════════════════════════════════════════════
-- 目的：旅遊團狀態自動推進（按日期推進、解決 DB 沒同步的問題）
-- ════════════════════════════════════════════════════════════════
--
-- 業務脈絡：
-- 旅遊團人生階段：模板 → 提案 → 即將出發 → 旅行中 → 未結案 → 已結案
-- 過去問題：沒有自動推進機制、靠人手動改、導致：
--   - DB 是 upcoming 但出發日早過了 → 列表 hack 偷偷顯示成 ongoing/returned
--   - 用戶看「進行中 tab」結果看到「未結案」label、超困惑
--
-- 修法：
-- 1. DB function：按日期推進 upcoming → ongoing → returned
--    - 不動 closed（紅線 D：已結案不能改）
--    - 不動 template / proposal（無日期、不在生命週期）
--    - 不動 archived（已封存）
-- 2. pg_cron 每天台北 00:05（UTC 16:05）跑一次
-- 3. Migration apply 時先跑一次、把既有的 12 筆狀態推進到正確值
--
-- 譬喻：飯店裝自動退房系統、每天半夜把該退房的房間自動標記、
--       不再靠櫃台手動按、也不靠列表偷偷美化。
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. function：自動推進邏輯 ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_advance_tour_status()
RETURNS TABLE(advanced_to_returned int, advanced_to_ongoing int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to_returned int;
  v_to_ongoing int;
BEGIN
  -- (1) 先把 upcoming/ongoing 但回程日已過的推進到 returned
  WITH updated AS (
    UPDATE public.tours
    SET status = 'returned', updated_at = NOW()
    WHERE status IN ('upcoming', 'ongoing')
      AND return_date IS NOT NULL
      AND return_date < CURRENT_DATE
      AND archived = false
    RETURNING id
  )
  SELECT COUNT(*) INTO v_to_returned FROM updated;

  -- (2) 再把 upcoming 但出發日已到、回程日未過的推進到 ongoing
  WITH updated AS (
    UPDATE public.tours
    SET status = 'ongoing', updated_at = NOW()
    WHERE status = 'upcoming'
      AND departure_date IS NOT NULL
      AND departure_date <= CURRENT_DATE
      AND (return_date IS NULL OR return_date >= CURRENT_DATE)
      AND archived = false
    RETURNING id
  )
  SELECT COUNT(*) INTO v_to_ongoing FROM updated;

  RETURN QUERY SELECT v_to_returned, v_to_ongoing;
END;
$$;

COMMENT ON FUNCTION public.auto_advance_tour_status() IS
  '自動推進旅遊團狀態：upcoming→ongoing→returned 按日期推進。不動 closed/template/proposal/archived。';

-- ── 2. pg_cron schedule ────────────────────────────────────────────
-- pg_cron extension 已在 pg_catalog 預裝、不重跑 CREATE EXTENSION

-- 移除舊 job（避免重複註冊）
SELECT cron.unschedule('tour-status-auto-advance')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tour-status-auto-advance'
);

-- 每天 UTC 16:05 = 台北 00:05 跑一次
SELECT cron.schedule(
  'tour-status-auto-advance',
  '5 16 * * *',
  $cron$
    SELECT public.auto_advance_tour_status();
  $cron$
);

-- ── 3. 第一次跑：把既有 12 筆狀態推進到正確值 ───────────────────
-- 一次性 backfill、避免要等到明天才看到效果
SELECT * FROM public.auto_advance_tour_status();

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════
-- BEGIN;
-- SELECT cron.unschedule('tour-status-auto-advance')
-- WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tour-status-auto-advance');
-- DROP FUNCTION IF EXISTS public.auto_advance_tour_status();
-- -- 注意：被推進的 status 不會自動回退、若需要可從 audit log 還原
-- COMMIT;
