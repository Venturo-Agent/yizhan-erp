-- ════════════════════════════════════════════════════════════════
-- 旅遊團加 brand_id：案子歸屬品牌（多品牌公司用、訂單繼承團的品牌）
-- 為什麼：品牌概念半套地基（brands 表 + employee_brands 有、但案子沒貼品牌）。
--         多品牌公司開團要能分辨品牌。這是品牌功能的 DB 地基。
-- FK → brands(id) ON DELETE SET NULL（刪品牌時團不連帶刪、僅清品牌、罕見）。
-- 回填：現有 61 團 → 各自 workspace 的「預設品牌」(is_default=true)。
-- 來源：2026-05-24 品牌功能、William 拍板（勁揚已刪、架構做好從新加）。
-- 狀態：已於 2026-05-24 經 MCP apply 到 production（aawrgygqgemgqssflfrx）並驗證（61/61 回填）。
-- ════════════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tours.brand_id IS '案子所屬品牌（多品牌公司、FK→brands、預設帶 workspace 預設品牌）';

UPDATE public.tours t
SET brand_id = b.id
FROM public.brands b
WHERE b.workspace_id = t.workspace_id
  AND b.is_default = true
  AND t.brand_id IS NULL;

COMMIT;

-- ════ Rollback（萬一要還原）════
-- ALTER TABLE public.tours DROP COLUMN IF EXISTS brand_id;
