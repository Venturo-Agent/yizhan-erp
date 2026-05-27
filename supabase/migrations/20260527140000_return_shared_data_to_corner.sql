-- ════════════════════════════════════════════════════════════════════════════
-- 公共池資料歸還角落（2026-05-27 William 拍板）
--
-- 為什麼：
--   原本「漫途整理公共池資料、賣給租戶讀」的販售概念全部取消（addon 品項已從
--   _registry.ts 凍住下架）。那批景點 / 飯店 / 餐廳資料本來就是「角落旅行社」
--   整理的、現歸還角落 workspace 名下，變角落私有資料，不再走 shared_data_content
--   公共池機制（後續 migration 會簡化 RLS、收掉該 gate）。
--
-- 動作：
--   created_by_workspace_id IS NULL（無主公共池）→ 角落 workspace。
--   角落 / LITE / 御風 自己建的（created_by_workspace_id 非 NULL）一律不動。
--   過戶前先把原 NULL 的 id 備份到 _shared_data_ownership_backup_20260527（可逆）。
--
-- 影響筆數（apply 前查）：景點 2540、飯店 484、餐廳 308，共 3332 筆。
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- 1. 備份原公共池 id（rollback 用、確認穩定後可 DROP）
CREATE TABLE IF NOT EXISTS public._shared_data_ownership_backup_20260527 (
  tbl text NOT NULL,
  id  uuid NOT NULL
);
INSERT INTO public._shared_data_ownership_backup_20260527 (tbl, id)
  SELECT 'attractions', id FROM public.attractions WHERE created_by_workspace_id IS NULL
  UNION ALL
  SELECT 'hotels',      id FROM public.hotels      WHERE created_by_workspace_id IS NULL
  UNION ALL
  SELECT 'restaurants', id FROM public.restaurants WHERE created_by_workspace_id IS NULL;

-- 2. 過戶給角落（a89335d4-85f1-492b-83c7-2476ab7c5d81 = 角落旅行社股份有限公司）
UPDATE public.attractions
  SET created_by_workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81'
  WHERE created_by_workspace_id IS NULL;
UPDATE public.hotels
  SET created_by_workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81'
  WHERE created_by_workspace_id IS NULL;
UPDATE public.restaurants
  SET created_by_workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81'
  WHERE created_by_workspace_id IS NULL;

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════════════════════════════════════
-- BEGIN;
-- UPDATE public.attractions  SET created_by_workspace_id = NULL
--   WHERE id IN (SELECT id FROM public._shared_data_ownership_backup_20260527 WHERE tbl = 'attractions');
-- UPDATE public.hotels       SET created_by_workspace_id = NULL
--   WHERE id IN (SELECT id FROM public._shared_data_ownership_backup_20260527 WHERE tbl = 'hotels');
-- UPDATE public.restaurants  SET created_by_workspace_id = NULL
--   WHERE id IN (SELECT id FROM public._shared_data_ownership_backup_20260527 WHERE tbl = 'restaurants');
-- COMMIT;
-- DROP TABLE public._shared_data_ownership_backup_20260527;
