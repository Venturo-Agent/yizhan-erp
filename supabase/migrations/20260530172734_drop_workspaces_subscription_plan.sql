-- 目的：砍除 workspaces.subscription_plan 欄位
--
-- 為什麼：William 2026-05-30 拍板把「輕量/標準/進階/旗艦」版本套餐整團拆除、
--         改成純功能開關（每個功能各自獨立開關、誰要誰自己勾）。版本套餐的業務
--         邏輯已於 code 層全部清除（刀1~4a），此欄位成為孤兒；唯一讀它的 billing
--         API 是空的、收費機制日後重做、不依賴此欄位。連根拔乾淨。
--
-- 破壞性（DROP COLUMN、不可逆）→ 先把現值備份到 backup 表、rollback 從備份重建還原。
BEGIN;

-- 1) 備份退路（9 家分店現有的版本值）
CREATE TABLE IF NOT EXISTS _backup_workspaces_subscription_plan_20260530 AS
SELECT id, subscription_plan FROM workspaces;

-- 2) 砍欄位
ALTER TABLE workspaces DROP COLUMN IF EXISTS subscription_plan;

-- 3) 讓 PostgREST 重新載入 schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- rollback（如需還原）：
-- BEGIN;
-- ALTER TABLE workspaces ADD COLUMN subscription_plan text;
-- UPDATE workspaces w SET subscription_plan = b.subscription_plan
--   FROM _backup_workspaces_subscription_plan_20260530 b WHERE w.id = b.id;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
-- DROP TABLE _backup_workspaces_subscription_plan_20260530;
