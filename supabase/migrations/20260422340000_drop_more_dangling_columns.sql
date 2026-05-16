-- 2026-04-22: 清 8 大族群砍除後留下的 dangling 欄位
-- itineraries 3 個 template FK 指向已砍模板（16 row 死指針）
-- tasks.project_id 指向已砍 projects（12 row 死指針、0 src 引用）
-- 注意：itineraries.template_id 不動（參照 itineraries 自己、是合法 self-reference）
BEGIN;
ALTER TABLE public.itineraries DROP COLUMN IF EXISTS cover_template_id;
ALTER TABLE public.itineraries DROP COLUMN IF EXISTS daily_template_id;
ALTER TABLE public.itineraries DROP COLUMN IF EXISTS flight_template_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS project_id;
COMMIT;
