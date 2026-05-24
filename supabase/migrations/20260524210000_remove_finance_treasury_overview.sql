-- ════════════════════════════════════════════════════════════════════
-- 移除「金庫總覽」(finance treasury overview) 的權限殘列
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼：
-- William 2026-05-24 確認金庫總覽頁(/finance/treasury)無人使用、已從程式碼移除
-- （側邊選單本來就直接連撥款頁 /finance/treasury/disbursement、總覽僅 finance hub 卡片連得到）。
-- 對應的 capability(finance.treasury.read/write) + feature(finance.treasury) 在 code 已移除
-- （modules/finance.ts 拿掉 treasury tab + 路由、codegen 重生權限檔）。
-- 這支 migration 清掉 DB 殘留的授權列、避免 HR 指派到不存在的能力 / 孤兒資料污染。
--
-- 撥款(disbursement)是獨立 capability(finance.disbursement.*)、feature 走模組層 'finance'、
-- 不受影響、不在本次清理範圍。
--
-- workspace_features 'finance.treasury' 其實早已是孤兒（現行 feature 以模組層 'finance' 為 code）、
-- 一併清掉。
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 清角色能力（finance.treasury.read / finance.treasury.write）
DELETE FROM public.role_capabilities
WHERE capability_code IN ('finance.treasury.read', 'finance.treasury.write');

-- 清租戶功能開關（finance.treasury、已孤兒）
DELETE FROM public.workspace_features
WHERE feature_code = 'finance.treasury';

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- 註：還原僅補回 DB 列、不會讓 code 重新認得這些 capability（code 已移除）。
-- 真要復活金庫總覽、需 revert modules/finance.ts + 還原 page.tsx + 重跑 codegen。
-- BEGIN;
-- -- 補回各 role 的 finance.treasury.read/write 需知道原本 grant 給哪些 role_id；
-- -- 原為 15 role 各一列、若需精確還原請從備份取 role_id 清單。
-- COMMIT;
