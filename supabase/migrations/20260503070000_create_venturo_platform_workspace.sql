-- ============================================================================
-- 20260503070000_create_venturo_platform_workspace.sql
--
-- N-M02: 建漫途整合行銷 platform workspace、平台 / 租戶分離
-- William 2026-05-02 拍板：
--   - 漫途 = 一個 workspace（不加特殊欄位區分、純靠 capability 判斷）
--   - Corner 不再有租戶管理功能（capability 移到漫途）
--   - 既有 useMyCapabilities sidebar 邏輯不變、自動正確顯示
--
-- 改動：
--   1. 建 VENTURO workspace（code='VENTURO'、type='platform'、name='漫途整合行銷'）
--   2. 建漫途的「平台主管」角色
--   3. William 在漫途加 employee record（同 user_id、新 employee 紀錄、E001）
--   4. Rename capability: settings.tenants.* → platform.tenants.*
--   5. 把 platform.* capability 從非漫途 role 全部移除
--   6. 給漫途「平台主管」role 掛全套 platform capability
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. 先清理 create_default_finance_settings trigger 的死段
--    起因：A3 task（2026-05-02）DROP 了 accounting_subjects 表、
--    但新建 workspace trigger 還在 INSERT 進那張表、會炸。
--    SSOT 收斂到 chart_of_accounts、預設科目要不要 backport 是後續業務決策、
--    這裡只拿掉死段、保留還在用的 payment_methods + bank_accounts 預設。
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_default_finance_settings()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- 1. 收款方式 (4 種，系統級)
  INSERT INTO public.payment_methods (workspace_id, code, name, type, description, sort_order, is_system)
  VALUES
    (NEW.id, 'CASH', '現金', 'receipt', '現金收款', 1, TRUE),
    (NEW.id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2, TRUE),
    (NEW.id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3, TRUE),
    (NEW.id, 'CHECK', '支票', 'receipt', '支票收款', 4, TRUE);

  -- 2. 付款方式 (4 種，系統級)
  INSERT INTO public.payment_methods (workspace_id, code, name, type, description, sort_order, is_system)
  VALUES
    (NEW.id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1, TRUE),
    (NEW.id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2, TRUE),
    (NEW.id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3, TRUE),
    (NEW.id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4, TRUE);

  -- 3. 銀行帳戶 (3 個基本帳戶)
  INSERT INTO public.bank_accounts (workspace_id, code, name, bank_name, is_default, is_active)
  VALUES
    (NEW.id, 'CASH', '現金', NULL, TRUE, TRUE),
    (NEW.id, 'BANK1', '主要銀行帳戶', '請設定銀行名稱', FALSE, TRUE),
    (NEW.id, 'BANK2', '備用銀行帳戶', '請設定銀行名稱', FALSE, TRUE);

  -- 會計科目（accounting_subjects 段）已於 2026-05-02 移除：
  -- 該表已 DROP（A3 SSOT 收斂、改 chart_of_accounts）。
  -- 預設 chart_of_accounts 要不要 backport 為後續業務決策。

  RETURN NEW;
END $$;

DO $$
DECLARE
  v_venturo_workspace_id uuid;
  v_platform_admin_role_id uuid;
  v_william_user_id uuid := '35880209-77eb-4827-84e3-c4e2bc013825';
BEGIN
  -- 1. 建漫途 workspace
  INSERT INTO public.workspaces (code, name, type, is_active)
  VALUES ('VENTURO', '漫途整合行銷', 'platform', true)
  RETURNING id INTO v_venturo_workspace_id;

  -- 2. 建漫途的「平台主管」角色
  INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
  VALUES (v_venturo_workspace_id, '平台主管', '漫途整合行銷平台級管理者', true, 1)
  RETURNING id INTO v_platform_admin_role_id;

  -- 3. William 在漫途加 employee record（同 user_id、新員工紀錄）
  INSERT INTO public.employees (
    user_id, workspace_id, employee_number,
    display_name, english_name, status, role_id
  )
  VALUES (
    v_william_user_id, v_venturo_workspace_id, 'E001',
    'William', 'William', 'active', v_platform_admin_role_id
  );

  -- 4. Capability rename：settings.tenants.* → platform.tenants.*
  UPDATE public.role_capabilities
  SET capability_code = 'platform.tenants.read'
  WHERE capability_code = 'settings.tenants.read';

  UPDATE public.role_capabilities
  SET capability_code = 'platform.tenants.write'
  WHERE capability_code = 'settings.tenants.write';

  -- 5. 把所有 platform.* capability 從非漫途 role 移除
  --    （Corner 等租戶 admin role 不再有平台級權限）
  DELETE FROM public.role_capabilities
  WHERE capability_code LIKE 'platform.%'
    AND role_id IN (
      SELECT r.id FROM public.workspace_roles r
      JOIN public.workspaces w ON w.id = r.workspace_id
      WHERE w.code != 'VENTURO'
    );

  -- 6. 給漫途「平台主管」role 掛全套 platform capability
  INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
  VALUES
    (v_platform_admin_role_id, 'platform.is_admin', true),
    (v_platform_admin_role_id, 'platform.tenants.read', true),
    (v_platform_admin_role_id, 'platform.tenants.write', true);

  RAISE NOTICE '✅ VENTURO workspace: %', v_venturo_workspace_id;
  RAISE NOTICE '✅ 平台主管 role: %', v_platform_admin_role_id;
END $$;
