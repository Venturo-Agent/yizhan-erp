-- ════════════════════════════════════════════════════════════════════════════
-- 清掉死的「獨立 customers」權限殘留（客戶收回 database module 的收尾）
--
-- 為什麼：
--   2026-05-26 William 拍板把「客戶」收回「資料管理」分區（database module）。
--   sidebar / module / codegen 三個檔已改（commit 3841ca4）。
--   但 DB 還殘留舊的「獨立 customers」權限、全是死資料（code 層零 caller）：
--     1) role_capabilities 的 customers.read / customers.write — 20 列
--        （系統主管 + 系統機器人、橫跨 9 個 workspace + 平台層 null）
--        route guard 走 database.customers、API 走 AI_HUB_WRITE/ORDERS_READ、
--        沒有任何 code 檢查 customers.*（已 grep 驗證）→ 發了也沒用、純殘留。
--        系統主管同時已有 database.customers.*、刪舊的毫髮無傷。
--     2) workspace_features 的 customers feature — 9 列
--        客戶頁的功能閘已由 database feature（/library 前綴）涵蓋、9 個 workspace
--        的 database feature 全開 → customers feature 變孤兒。
--
--   create-tenant-seed.ts 已同步移除 'customers' feature seed（同 commit）、
--   新租戶不會再長回來。
--
-- 影響：無行為改變（刪的全是死權限、現行 prod 也沒 code 在看）。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1) 刪死的 customers.read / customers.write role_capabilities
DELETE FROM public.role_capabilities
WHERE capability_code IN ('customers.read', 'customers.write');

-- 2) 刪孤兒 customers workspace_features
DELETE FROM public.workspace_features
WHERE feature_code = 'customers';

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- 註：刪的是死權限（無 code caller）、還原無實際作用、僅供完整性。
--    精確還原需原始 role_id / workspace_id，下方為「重新授予」邏輯範例：
-- BEGIN;
-- -- 還原系統機器人（平台層）的 customers.*（見原始 seed 20260509155550）
-- INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
-- SELECT wr.id, c.code, true
-- FROM public.workspace_roles wr
-- CROSS JOIN (VALUES ('customers.read'), ('customers.write')) AS c(code)
-- WHERE wr.name IN ('系統機器人', '系統主管')
-- ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;
-- COMMIT;
