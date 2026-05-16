-- 把 Corner 的「業務 / 會計 / 助理」當作預設模板（2026-04-22）
-- 同步到 JINGYAO / YUFEN / TESTUX 的同名職務
--
-- 背景：
--   William 要在後續功能測試時、用其他 workspace 的業務/會計帳號模擬角色差異、
--   但發現他們的權限 row 數遠少於 Corner（業務 8-25 vs Corner 40）、
--   測試會誤判「功能有 bug」（其實是職務權限設定不完整）。
--   兩層守門（workspace_features + role_tab_permissions）會自己擋沒買的功能、
--   所以職務模板「寬鬆預填」不會造成租戶邊界問題。
--
-- 修法：
--   對 JINGYAO / YUFEN / TESTUX 的「業務 / 會計 / 助理」三個職務、
--   INSERT Corner 對應職務的所有 role_tab_permissions row。
--   ON CONFLICT 覆蓋（以 Corner 為準）。既有 row 不在 Corner 裡的保留（不刪）。
--
-- 影響範圍：
--   - 只動 3 個 workspace × 3 個職務 = 9 個 role 的 role_tab_permissions
--   - 不動 admin role（P001 backfill 已處理）
--   - 不動 Corner 自己（它是來源）
--   - 不動其他自訂職務（領隊 / 團控 / 導遊等）
--
-- 不屬本次 scope（未來 P007）：
--   - 新建 workspace 時的 seed 邏輯（tenants/create）
--   - 建「標準職務模板」持續同步機制

BEGIN;

-- 先看套用前狀況（日誌）
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== BEFORE ===';
  FOR r IN
    SELECT w.code AS workspace_code, wr.name AS role_name, COUNT(rtp.id) AS row_count
    FROM workspaces w
    JOIN workspace_roles wr ON wr.workspace_id = w.id
    LEFT JOIN role_tab_permissions rtp ON rtp.role_id = wr.id
    WHERE w.code IN ('CORNER', 'JINGYAO', 'YUFEN', 'TESTUX')
      AND wr.name IN ('業務', '會計', '助理')
    GROUP BY w.code, wr.name
    ORDER BY w.code, wr.name
  LOOP
    RAISE NOTICE '  % / %: % rows', r.workspace_code, r.role_name, r.row_count;
  END LOOP;
END $$;

-- 主同步邏輯
WITH corner_roles AS (
  SELECT wr.id AS role_id, wr.name
  FROM workspace_roles wr
  JOIN workspaces w ON w.id = wr.workspace_id
  WHERE w.code = 'CORNER'
    AND wr.name IN ('業務', '會計', '助理')
),
target_roles AS (
  SELECT wr.id AS role_id, wr.name
  FROM workspace_roles wr
  JOIN workspaces w ON w.id = wr.workspace_id
  WHERE w.code IN ('JINGYAO', 'YUFEN', 'TESTUX')
    AND wr.name IN ('業務', '會計', '助理')
)
INSERT INTO role_tab_permissions (role_id, module_code, tab_code, can_read, can_write)
SELECT tr.role_id, cp.module_code, cp.tab_code, cp.can_read, cp.can_write
FROM target_roles tr
JOIN corner_roles cr ON cr.name = tr.name
JOIN role_tab_permissions cp ON cp.role_id = cr.role_id
ON CONFLICT (role_id, module_code, tab_code) DO UPDATE
  SET can_read = EXCLUDED.can_read,
      can_write = EXCLUDED.can_write,
      updated_at = now();

-- 套用後狀況（日誌 + 驗證）
DO $$
DECLARE
  r RECORD;
  min_expected INT;
BEGIN
  RAISE NOTICE '=== AFTER ===';
  FOR r IN
    SELECT w.code AS workspace_code, wr.name AS role_name, COUNT(rtp.id) AS row_count
    FROM workspaces w
    JOIN workspace_roles wr ON wr.workspace_id = w.id
    LEFT JOIN role_tab_permissions rtp ON rtp.role_id = wr.id
    WHERE w.code IN ('CORNER', 'JINGYAO', 'YUFEN', 'TESTUX')
      AND wr.name IN ('業務', '會計', '助理')
    GROUP BY w.code, wr.name
    ORDER BY w.code, wr.name
  LOOP
    RAISE NOTICE '  % / %: % rows', r.workspace_code, r.role_name, r.row_count;
  END LOOP;

  -- 驗證：非 Corner 的 3 家業務/會計/助理應該 >= Corner 對應數
  FOR r IN
    WITH corner_counts AS (
      SELECT wr.name, COUNT(rtp.id) AS corner_count
      FROM workspace_roles wr
      JOIN workspaces w ON w.id = wr.workspace_id
      LEFT JOIN role_tab_permissions rtp ON rtp.role_id = wr.id
      WHERE w.code = 'CORNER' AND wr.name IN ('業務', '會計', '助理')
      GROUP BY wr.name
    )
    SELECT
      w.code AS workspace_code,
      wr.name AS role_name,
      COUNT(rtp.id) AS actual_count,
      cc.corner_count AS expected_min
    FROM workspace_roles wr
    JOIN workspaces w ON w.id = wr.workspace_id
    LEFT JOIN role_tab_permissions rtp ON rtp.role_id = wr.id
    JOIN corner_counts cc ON cc.name = wr.name
    WHERE w.code IN ('JINGYAO', 'YUFEN', 'TESTUX')
      AND wr.name IN ('業務', '會計', '助理')
    GROUP BY w.code, wr.name, cc.corner_count
    HAVING COUNT(rtp.id) < cc.corner_count
  LOOP
    RAISE EXCEPTION 'SYNC FAILED: % / % has % rows, expected >= %',
      r.workspace_code, r.role_name, r.actual_count, r.expected_min;
  END LOOP;

  RAISE NOTICE '✓ All 3 workspaces × 3 roles synced from Corner template';
END $$;

COMMIT;
