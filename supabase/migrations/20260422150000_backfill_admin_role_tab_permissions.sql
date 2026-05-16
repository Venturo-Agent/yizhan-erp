-- P001 Phase A — Backfill admin role 的 role_tab_permissions（2026-04-22）
--
-- 背景：
--   原本代碼有 isAdmin 短路（auth-store.ts:249 等處）、admin 用戶被自動放行、
--   所以 admin role 在 role_tab_permissions 只存了零星 row（14-24 個、不是完整 54）。
--   P001 要拔掉前端 isAdmin 短路、admin 用戶將改走 user.permissions 比對、
--   如果 role_tab_permissions 沒預填完整、admin 會白屏。
--
-- 修法：
--   對所有 is_admin=true 的 workspace_role、upsert 所有 MODULES × tabs 的 row、
--   can_read = true、can_write = true。使用 UNIQUE (role_id, module_code, tab_code)
--   的 ON CONFLICT、不覆蓋既有設定的意圖（反正 admin 應該全開）。
--
-- 對齊：
--   - MODULES 清單硬 coded 對齊 src/lib/permissions/module-tabs.ts（2026-04-22）
--   - permission key 格式：`${module_code}:${tab_code}` 或 `${module_code}`（tab_code=null）
--     對齊 validate-login/route.ts:170-174
--
-- 未來：
--   - 新 workspace 建立時的 seed 路徑（tenants/create 等）需同步更新、另案
--   - MODULES 變動時、此 migration 需重跑或建 cron 同步
--
-- 驗證：
--   跑完此 migration 後、每個 is_admin=true 的 role 應有 54 個 role_tab_permissions row
--   （48 個 tab row + 6 個無 tab 的模組 row）

BEGIN;

-- 所有模組 × tab 組合（對齊 src/lib/permissions/module-tabs.ts）
-- 無 tab 的模組用 tab_code = NULL
WITH module_tabs (module_code, tab_code) AS (
  VALUES
    -- 無 tab 的模組（6 個）
    ('calendar', NULL),
    ('workspace', NULL),
    ('todos', NULL),
    ('visas', NULL),
    ('design', NULL),
    ('office', NULL),

    -- tours（14 tab：11 功能 + 3 eligibility）
    ('tours', 'overview'),
    ('tours', 'orders'),
    ('tours', 'members'),
    ('tours', 'itinerary'),
    ('tours', 'display-itinerary'),
    ('tours', 'quote'),
    ('tours', 'requirements'),
    ('tours', 'confirmation-sheet'),
    ('tours', 'contract'),
    ('tours', 'checkin'),
    ('tours', 'closing'),
    ('tours', 'as_sales'),
    ('tours', 'as_assistant'),
    ('tours', 'as_tour_controller'),

    -- orders（5 tab）
    ('orders', 'list'),
    ('orders', 'create'),
    ('orders', 'edit'),
    ('orders', 'payments'),
    ('orders', 'travelers'),

    -- finance（11 tab：10 功能 + 1 eligibility）
    ('finance', 'payments'),
    ('finance', 'payments-company'),
    ('finance', 'payments-confirm'),
    ('finance', 'requests'),
    ('finance', 'requests-company'),
    ('finance', 'treasury'),
    ('finance', 'disbursement'),
    ('finance', 'travel-invoice'),
    ('finance', 'reports'),
    ('finance', 'settings'),
    ('finance', 'advance_payment'),

    -- accounting（6 tab）
    ('accounting', 'vouchers'),
    ('accounting', 'accounts'),
    ('accounting', 'period-closing'),
    ('accounting', 'opening-balances'),
    ('accounting', 'checks'),
    ('accounting', 'reports'),

    -- hr（5 tab）
    ('hr', 'employees'),
    ('hr', 'roles'),
    ('hr', 'attendance'),
    ('hr', 'leave'),
    ('hr', 'payroll'),

    -- database（5 tab）
    ('database', 'customers'),
    ('database', 'customer-groups'),
    ('database', 'attractions'),
    ('database', 'suppliers'),
    ('database', 'archive'),

    -- settings（2 tab）
    ('settings', 'personal'),
    ('settings', 'company')
),
admin_roles AS (
  SELECT id AS role_id
  FROM workspace_roles
  WHERE is_admin = true
)
INSERT INTO role_tab_permissions (role_id, module_code, tab_code, can_read, can_write)
SELECT
  ar.role_id,
  mt.module_code,
  mt.tab_code,
  true,
  true
FROM admin_roles ar
CROSS JOIN module_tabs mt
ON CONFLICT (role_id, module_code, tab_code) DO UPDATE
  SET can_read = true,
      can_write = true,
      updated_at = now();

-- 驗證：每個 is_admin role 應該有 54 個 row
DO $$
DECLARE
  r RECORD;
  expected_count INT := 54;
  fail_count INT := 0;
BEGIN
  FOR r IN
    SELECT
      w.code AS workspace_code,
      wr.id AS role_id,
      wr.name AS role_name,
      COUNT(rtp.id) AS actual_count
    FROM workspace_roles wr
    JOIN workspaces w ON w.id = wr.workspace_id
    LEFT JOIN role_tab_permissions rtp ON rtp.role_id = wr.id
    WHERE wr.is_admin = true
    GROUP BY w.code, wr.id, wr.name
  LOOP
    IF r.actual_count < expected_count THEN
      RAISE WARNING 'Admin role % (ws: %) has only % rows, expected >= %',
        r.role_name, r.workspace_code, r.actual_count, expected_count;
      fail_count := fail_count + 1;
    ELSE
      RAISE NOTICE 'Admin role % (ws: %): % rows ✓',
        r.role_name, r.workspace_code, r.actual_count;
    END IF;
  END LOOP;

  IF fail_count > 0 THEN
    RAISE EXCEPTION 'Backfill failed for % admin role(s)', fail_count;
  END IF;
END $$;

COMMIT;
