-- Drop 9 dead tables — 0 程式碼引用、無別表 FK 依賴
--
-- 砍除清單：
-- 1. announcements (0 row) — 公告功能未實作
-- 2. badges (1 row) — 徽章系統廢棄
-- 3. friends (0 row) — 朋友功能未實作
-- 4. missed_clock_requests (0 row) — 補打卡（HR 已砍薪資族）
-- 5. overtime_requests (0 row) — 加班申請（HR 已砍薪資族）
-- 6. refunds (0 row) — 退款（藍新還沒做）
-- 7. ai_bots (6 row) — AI bot 設定、未接 ERP 主程式
-- 8. ai_messages (8 row) — AI 對話訊息、未接 ERP 主程式
-- 9. agent_registry (17 row) — Agent 平台測試表（2026-03-18 灌、用魔法命名、已淘汰）
--
-- 驗證：
-- - grep .from('xxx') / TABLES.XXX / 字串引用 = 0
-- - 無其他表 FK 指向這 9 張（這 9 張自己的 FK 砍掉時自動消失）
-- - 9 張總 row 數 = 32（極少、未使用）

DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
DROP TABLE IF EXISTS public.missed_clock_requests CASCADE;
DROP TABLE IF EXISTS public.overtime_requests CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;
DROP TABLE IF EXISTS public.ai_bots CASCADE;
DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS public.agent_registry CASCADE;
