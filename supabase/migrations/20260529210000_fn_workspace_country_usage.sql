-- 為什麼：恢復「開團/報價單選國家」的常用排序（5/12 拿掉 usage_count、國家改全球共用 ref_countries）。
--   各公司自己算自己的：即時統計該 workspace 的 tours + quotes 各國家出現次數。
--   read-only 函式（不新增表、不碰開團寫入路徑）→ 零風險打到開團；下拉讀失敗只退回字母排序。
-- scoped by get_current_user_workspace()（同 RLS 用的函式）→ 跨租戶隔離。
-- 設計來源：見對話；對應 countries.ts 註解「之後若要做使用統計、走獨立的 user_country_usage 表」的精神，
--   但採 read-only 推算、免維護計次寫入。

BEGIN;

CREATE OR REPLACE FUNCTION public.get_workspace_country_usage()
RETURNS TABLE(country_code text, usage_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.country_code, count(*) AS usage_count
  FROM (
    SELECT country_code FROM public.tours
      WHERE workspace_id = get_current_user_workspace()
        AND country_code IS NOT NULL AND country_code <> ''
    UNION ALL
    SELECT country_code FROM public.quotes
      WHERE workspace_id = get_current_user_workspace()
        AND country_code IS NOT NULL AND country_code <> ''
  ) c
  GROUP BY c.country_code;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_country_usage() FROM public;
GRANT EXECUTE ON FUNCTION public.get_workspace_country_usage() TO authenticated;

COMMIT;

-- rollback:
-- DROP FUNCTION IF EXISTS public.get_workspace_country_usage();
