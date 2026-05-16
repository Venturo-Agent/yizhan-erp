-- =============================================
-- Migration: 砍 employees.roles dead column
-- Date: 2026-04-24
--
-- ⚠️ 此 migration 必須在 deploy 後才執行
-- 因為 deploy 前線上 code 可能還在寫 roles (新版已拿掉、但舊版還在跑)
--
-- 背景:
--   X1 audit 確認: employees.roles (text[]) 沒有 application reader
--   權限決策走 employees.role_id → workspace_roles.is_admin / role_tab_permissions
--   roles 欄位是 P001 改架構前的殘骸、現在純 dead column
--
--   驗證:
--     - grep src 找 employees.roles read site: 0 處
--     - 寫入端 (tenants/create + workspaces/route) 已拿掉 roles 寫入
--
-- 影響:
--   現有 15 row 有 roles 值 (5 個非 default)、砍 column 直接消失
--   不影響業務 (因為沒人讀)
--
-- Rollback: 見同目錄 .ROLLBACK.sql
-- =============================================

BEGIN;

ALTER TABLE public.employees DROP COLUMN IF EXISTS roles;

DO $$
DECLARE
  c int;
BEGIN
  SELECT count(*) INTO c
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='employees' AND column_name='roles';
  IF c > 0 THEN RAISE EXCEPTION 'roles column 沒被 drop'; END IF;
END $$;

COMMIT;
