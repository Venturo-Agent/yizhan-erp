-- 2026-04-22: 砍 magic_library（War Room 內部頁、未上線）+ system_settings（NewebPay 整套未做完）
-- William 決策：兩個功能未來重新開發、現階段移除以利 P020 / 上線整理
BEGIN;
DROP TABLE IF EXISTS public.magic_library CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
COMMIT;
