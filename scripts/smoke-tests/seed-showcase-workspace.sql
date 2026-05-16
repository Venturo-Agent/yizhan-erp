-- 建立「漫途展示旅行社」showcase workspace + 完整 demo 故事
-- 跑前條件：tenant create trigger 已修（migration 20260511000040）
--
-- 帳號：demo@venturo.tw / 密碼透過 supabase admin createUser 設（這份 SQL 不管 auth user）
-- 使用方式：先用 supabase admin API 建 demo@venturo.tw user、拿 user_id 帶進來
--
-- 預期結果：1 workspace、25 chart_of_accounts (trigger)、9 payment_methods (trigger)、3 bank_accounts (trigger)
--           + 1 employee、5 roles、19 features、1 brand、1 branch、1 department
--           + 5 customers / 4 quotes / 3 tours / 6 orders / 13 members / 6 receipts / 7 payment_requests / 2 vouchers + 5 lines / 1 closing / 2 contracts

\set DEMO_USER_ID '''PLACEHOLDER_DEMO_USER_UUID'''

DO $$
DECLARE
  WS uuid;
  EMP uuid;
  ROLE_ADMIN uuid;
  ROLE_SALES uuid;
  ROLE_ACC uuid;
  ROLE_ASSIST uuid;
  ROLE_OP uuid;
  -- 沿用 agency@venturo.tw 的 user_id 當 demo 帳號 user 也能、實際請改成新 user
  -- demo_user 由 :DEMO_USER_ID 帶進來
BEGIN
  -- ===== 1. workspace =====
  INSERT INTO public.workspaces (name, code, max_employees, is_active, premium_enabled, tax_id, is_multi_branch, is_multi_department)
  VALUES ('漫途展示旅行社', 'SHOWCASE', NULL, true, true, '99999999', false, false)
  RETURNING id INTO WS;
  -- trigger 自動建 25 chart_of_accounts + 9 payment_methods + 3 bank_accounts

  -- ===== 2. workspace_roles =====
  INSERT INTO public.workspace_roles (workspace_id, name, is_admin, sort_order) VALUES
    (WS, '系統主管', true, 1) RETURNING id INTO ROLE_ADMIN;
  INSERT INTO public.workspace_roles (workspace_id, name, is_admin, sort_order) VALUES
    (WS, '業務', false, 2) RETURNING id INTO ROLE_SALES;
  INSERT INTO public.workspace_roles (workspace_id, name, is_admin, sort_order) VALUES
    (WS, '會計', false, 3) RETURNING id INTO ROLE_ACC;
  INSERT INTO public.workspace_roles (workspace_id, name, is_admin, sort_order) VALUES
    (WS, '助理', false, 4) RETURNING id INTO ROLE_ASSIST;
  INSERT INTO public.workspace_roles (workspace_id, name, is_admin, sort_order) VALUES
    (WS, 'OP', false, 5) RETURNING id INTO ROLE_OP;

  -- ===== 3. workspace_features (核心都開) =====
  INSERT INTO public.workspace_features (workspace_id, feature_code, enabled, enabled_at) VALUES
    (WS, 'dashboard', true, now()),
    (WS, 'tours', true, now()),
    (WS, 'orders', true, now()),
    (WS, 'customers', true, now()),
    (WS, 'finance', true, now()),
    (WS, 'accounting', true, now()),
    (WS, 'hr', true, now()),
    (WS, 'todos', true, now()),
    (WS, 'calendar', true, now()),
    (WS, 'database', true, now()),
    (WS, 'tour_attributes', true, now()),
    (WS, 'settings', true, now());

  -- ===== 4. brands / branches / departments =====
  INSERT INTO public.brands (workspace_id, code, name, is_default, display_order)
  VALUES (WS, 'SHOWCASE', '漫途展示', true, 0);

  INSERT INTO public.branches (workspace_id, code, name, is_default, display_order)
  VALUES (WS, 'HQ', '總部', true, 0);

  INSERT INTO public.departments (workspace_id, code, name, is_default, display_order)
  VALUES (WS, 'MAIN', '總公司', true, 0);

  -- ===== 5. demo employee =====
  -- user_id 來自 psql 變數 :DEMO_USER_ID
  -- INSERT INTO public.employees (workspace_id, employee_number, chinese_name, display_name, email, user_id, role_id, status, must_change_password)
  -- VALUES (WS, 'D001', '示範客戶', 'Demo User', 'demo@venturo.tw', :DEMO_USER_ID, ROLE_ADMIN, 'active', false)
  -- RETURNING id INTO EMP;

  -- 在 SQL 外的 wrapper script 用 supabase admin createUser 拿 demo_user_id、然後 INSERT employee
  -- 然後用同個 wrapper 跑 demo seed (借用 20260511000010 的故事、把 WS 換成這個)

  RAISE NOTICE 'showcase workspace created: %', WS;
END $$;
