-- =============================================
-- 加 hr.settings tab：給每個 workspace 的 admin role 補 read/write row
-- 2026-04-24
--
-- 背景：
--   module-tabs.ts 同次 commit 加了 hr.settings tab（出勤設定 / GPS 打卡 / LINE 機器人）。
--   admin role 在 UI 上權限是 disabled（永遠全開）、但實際上靠 role_tab_permissions
--   表的 row 才能 canRead/canWrite 通過。沒這支 backfill、admin 自己也進不去 /hr/settings。
--
-- 為什麼只 backfill admin（不 backfill 業務/會計/助理）：
--   出勤設定預設只給管理員。HR 之後想分派給其他職務、自己去職務管理頁勾就好。
--   非 admin 沒 row 自然 canRead 回 false、HR 介面顯示「未勾」、HR 勾下去就 INSERT。
--
-- 配套程式改動（同次 PR）：
--   - module-tabs.ts hr 模組加 settings tab（code='settings', name='出勤設定'）
--   - /hr/settings/page.tsx 加 canRead('hr', 'settings') gate
--   - PLATFORM_ADMIN_ROUTES 拔掉 /hr/settings（轉成 HR 職務管控）
-- =============================================

INSERT INTO public.role_tab_permissions (role_id, module_code, tab_code, can_read, can_write)
SELECT id, 'hr', 'settings', true, true
FROM public.workspace_roles
WHERE is_admin = true
ON CONFLICT (role_id, module_code, tab_code) DO UPDATE
  SET can_read = true,
      can_write = true,
      updated_at = now();
