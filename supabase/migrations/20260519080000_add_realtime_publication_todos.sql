-- 為什麼：
-- SWR 水管健檢（workspace/_meta/architecture/2026-05-19-SWR-水管健檢.md）發現
-- todos entity 透過 createEntityHook 訂閱 Supabase realtime channel、
-- 但 Postgres `supabase_realtime` publication 沒加 todos table、
-- 結果訂閱「白訂」、Supabase 永遠不推播、cache 靜默 stale。
--
-- todos.ts 明確標 `cache: high, // todos 高頻、Realtime 刷`、設計意圖就是要 realtime。
--
-- 注意：原本健檢報告也列 cis_clients / cis_pricing_items / cis_visits、但 DB 內這 3 張表
-- 完全不存在（CIS 模組前端寫完、schema 沒做）、屬另一類技術債、不在本 migration 範圍。
--
-- 偵測：scripts/audit-realtime.ts --db 比對 entity 訂閱 vs publication 差集。

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.todos;
-- COMMIT;
