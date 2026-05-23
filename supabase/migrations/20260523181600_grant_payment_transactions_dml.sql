-- 補 payment_transactions 的 table-level DML GRANT 給 authenticated role
--
-- 為什麼（根因）：
--   2026-05-22 建 payment_transactions 表的 migration（sinopac payment provider skeleton）
--   建了 RLS policy（4 條、workspace 隔離正確）、但漏了 table-level GRANT 的 DML 部分。
--   authenticated role 只拿到 SELECT、缺 INSERT / UPDATE / DELETE。
--   結果：有 finance.payments.write capability 的員工按「產生付款連結」時、
--   API 用 user client INSERT payment_transactions → PostgreSQL table 層直接擋
--   （ERROR: permission denied for table payment_transactions、SQLSTATE 42501）
--   → API translateDbError 回 403 Forbidden。
--
--   實測佐證（2026-05-23）：
--   - requireCapability(finance.payments.write) = allowed:true（capability 沒問題）
--   - postgres log: "permission denied for table payment_transactions"
--   - 對比 payment_methods（同類正常表）authenticated 有完整 SELECT/INSERT/UPDATE/DELETE
--
-- 安全性（為什麼補 GRANT 不會開洞）：
--   PostgreSQL 權限是兩層獨立的門：
--   (1) table GRANT  = authenticated 能不能「碰」這張表
--   (2) RLS policy   = 碰得到「哪些 row」
--   payment_transactions 已有 RLS policy：
--     INSERT WITH CHECK (workspace_id = get_current_user_workspace())
--     SELECT/UPDATE/DELETE USING (workspace_id = get_current_user_workspace())
--   所以補了 GRANT、員工仍只能寫/改/刪自己 workspace 的 row、跨租戶仍擋。
--   這跟 payment_methods 的授權模式完全一致。
--
-- 跟今天的 JWT 改動（getUser→getClaims）無關 — 純建表疏漏、任何 workspace 任何環境都會中。

BEGIN;

GRANT INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- BEGIN;
-- REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions FROM authenticated;
-- COMMIT;
