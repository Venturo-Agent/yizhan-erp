-- 漫途 demo 業務資料 seed (v2 - UUID 格式 id)
-- 完整故事：客戶 → 報價 → 旅遊團 → 訂單 → 收款 → 請款 → 結案 → 結轉
-- workspace = b2222222-2222-2222-2222-222222222222 (漫途整合行銷)

DO $$
DECLARE
  WS uuid := 'b2222222-2222-2222-2222-222222222222';
  WILLIAM uuid := '6c7d23c9-189f-4624-abcc-15088698bd4f';
  ACC_CASH uuid;
  ACC_AR uuid;
  ACC_REVENUE uuid;
  ACC_COST uuid;
  ACC_EXPENSE uuid;
  PM_TRANSFER_R uuid := '0df3047c-f73a-4496-b7a2-f2e6f84f632a';
  PM_CASH_R uuid := '2db827a7-2418-46dc-91c9-b5dccde9c8d1';
  PM_CARD_R uuid := '45d26ab7-59d1-4627-b792-5fcd3d226567';
  PM_TRANSFER_P uuid := '7b6b44d5-5e6f-49ed-9fea-93ebe63bc8aa';
  -- customers (UUID 格式但儲存為 text)
  C_WANG text := '11111111-1111-4111-8111-000000000001';
  C_LI   text := '11111111-1111-4111-8111-000000000002';
  C_CHEN text := '11111111-1111-4111-8111-000000000003';
  C_LIXIN text := '11111111-1111-4111-8111-000000000004';
  C_CHUANDA text := '11111111-1111-4111-8111-000000000005';
  -- tours
  TOUR_PAST text := '22222222-2603-4001-8000-000000000001';
  TOUR_NOW text := '22222222-2606-4001-8000-000000000001';
  TOUR_OPEN text := '22222222-2607-4001-8000-000000000001';
  -- orders
  ORD_PAST text := '33333333-2603-4001-8000-000000000001';
  ORD_NOW1 text := '33333333-2606-4001-8000-000000000001';
  ORD_NOW2 text := '33333333-2606-4001-8000-000000000002';
  ORD_OPEN1 text := '33333333-2607-4001-8000-000000000001';
  ORD_OPEN2 text := '33333333-2607-4001-8000-000000000002';
  ORD_OPEN3 text := '33333333-2607-4001-8000-000000000003';
  -- quotes
  Q_LIXIN text := '44444444-2604-4001-8000-000000000001';
  Q_WANG text := '44444444-2604-4001-8000-000000000002';
  Q_CHUANDA text := '44444444-2605-4001-8000-000000000001';
  Q_CHEN text := '44444444-2604-4001-8000-000000000003';
  -- voucher ids
  V_REVENUE uuid;
  V_COST uuid;
BEGIN
  -- ===== Cleanup any partial seed (idempotent) =====
  DELETE FROM public.journal_lines WHERE voucher_id IN (SELECT id FROM public.journal_vouchers WHERE workspace_id = WS AND voucher_no LIKE 'JV-2604-%');
  DELETE FROM public.journal_vouchers WHERE workspace_id = WS AND voucher_no LIKE 'JV-2604-%';
  DELETE FROM public.accounting_period_closings WHERE workspace_id = WS AND period_start = '2026-04-01';
  DELETE FROM public.tour_bonus_settings WHERE workspace_id = WS AND tour_id IN (TOUR_PAST, TOUR_NOW, TOUR_OPEN);
  DELETE FROM public.tour_departure_data WHERE tour_id IN (TOUR_PAST, TOUR_NOW, TOUR_OPEN);
  DELETE FROM public.contracts WHERE workspace_id = WS AND tour_id IN (TOUR_PAST, TOUR_NOW, TOUR_OPEN);
  DELETE FROM public.payment_requests WHERE workspace_id = WS AND tour_id IN (TOUR_PAST, TOUR_NOW, TOUR_OPEN);
  DELETE FROM public.receipts WHERE workspace_id = WS AND tour_id IN (TOUR_PAST, TOUR_NOW, TOUR_OPEN);
  DELETE FROM public.order_members WHERE order_id IN (ORD_PAST, ORD_NOW1, ORD_NOW2, ORD_OPEN1, ORD_OPEN2, ORD_OPEN3);
  DELETE FROM public.orders WHERE workspace_id = WS AND id IN (ORD_PAST, ORD_NOW1, ORD_NOW2, ORD_OPEN1, ORD_OPEN2, ORD_OPEN3);
  DELETE FROM public.tours WHERE workspace_id = WS AND id IN (TOUR_PAST, TOUR_NOW, TOUR_OPEN);
  DELETE FROM public.quotes WHERE workspace_id = WS AND id IN (Q_LIXIN, Q_WANG, Q_CHUANDA, Q_CHEN);
  DELETE FROM public.customers WHERE workspace_id = WS AND id IN (C_WANG, C_LI, C_CHEN, C_LIXIN, C_CHUANDA);

  -- ===== Chart of Accounts =====
  INSERT INTO public.chart_of_accounts (workspace_id, code, name, account_type, is_system_locked, is_active)
  SELECT WS, '1100', '現金', 'asset', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '1100');
  SELECT id INTO ACC_CASH FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '1100';

  INSERT INTO public.chart_of_accounts (workspace_id, code, name, account_type, is_system_locked, is_active)
  SELECT WS, '1200', '應收帳款', 'asset', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '1200');
  SELECT id INTO ACC_AR FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '1200';

  INSERT INTO public.chart_of_accounts (workspace_id, code, name, account_type, is_system_locked, is_active)
  SELECT WS, '4000', '營業收入', 'revenue', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '4000');
  SELECT id INTO ACC_REVENUE FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '4000';

  INSERT INTO public.chart_of_accounts (workspace_id, code, name, account_type, is_system_locked, is_active)
  SELECT WS, '5000', '營業成本', 'cost', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '5000');
  SELECT id INTO ACC_COST FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '5000';

  INSERT INTO public.chart_of_accounts (workspace_id, code, name, account_type, is_system_locked, is_active)
  SELECT WS, '6000', '營業費用', 'expense', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '6000');
  SELECT id INTO ACC_EXPENSE FROM public.chart_of_accounts WHERE workspace_id = WS AND code = '6000';

  -- ===== 銀行帳戶 =====
  INSERT INTO public.bank_accounts (workspace_id, code, name, bank_name, account_number, is_default, is_active)
  SELECT WS, 'BANK01', '玉山銀行 - 漫途主帳戶', '玉山銀行', '0888-0123-456789', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE workspace_id = WS AND code = 'BANK01');

  -- ===== 客戶 5 位 =====
  INSERT INTO public.customers (id, workspace_id, code, name, phone, email, member_type, is_vip, vip_level, is_active)
  VALUES
    (C_WANG,    WS, 'C-001', '王小明', '0912-345-678', 'wang.xm@example.com', 'member', true, 'gold', true),
    (C_LI,      WS, 'C-002', '李美玉', '0922-111-222', 'li.my@example.com',   'member', false, null,    true),
    (C_CHEN,    WS, 'C-003', '陳大華', '0933-555-666', 'chen.dh@example.com', 'member', false, null,    true),
    (C_LIXIN,   WS, 'C-004', '力晶半導體股份有限公司', '03-579-9888', 'hr@lixin.example', 'member', true, 'platinum', true),
    (C_CHUANDA, WS, 'C-005', '創達電子股份有限公司',   '02-2655-1234', 'hr@chuanda.example', 'member', true, 'platinum', true);

  -- ===== 報價單 4 張 =====
  INSERT INTO public.quotes (id, code, name, customer_id, customer_name, customer_phone, customer_email,
    workspace_id, destination, start_date, end_date, days, nights, adult_count, total_amount, status,
    converted_to_tour, tour_id, tour_code, handler_name, valid_until, issue_date, version, group_size, is_active)
  VALUES
    (Q_LIXIN, 'Q-2604-001', '力晶半導體 - 東京商務考察 5 日', C_LIXIN,
     '力晶半導體', '03-579-9888', 'hr@lixin.example',
     WS, '日本東京', '2026-04-01', '2026-04-05', 5, 4, 20, 1280000, 'confirmed',
     true, TOUR_PAST, 'T-2603-001', 'William', '2026-03-25', '2026-03-15', 3, 20, true);

  INSERT INTO public.quotes (id, code, name, customer_id, customer_name, customer_phone,
    workspace_id, destination, start_date, end_date, days, nights, adult_count, total_amount, status,
    handler_name, valid_until, issue_date, version, group_size, is_active, notes)
  VALUES
    (Q_WANG, 'Q-2604-002', '王小明 - 北海道粉雪溫泉 6 日客製', C_WANG,
     '王小明', '0912-345-678',
     WS, '日本北海道', '2026-12-20', '2026-12-25', 6, 5, 4, 320000, 'draft',
     'William', '2026-06-30', '2026-05-08', 1, 4, true, '客戶要求二世谷 5 星酒店 + 私人雪場教練');

  INSERT INTO public.quotes (id, code, name, customer_id, customer_name, customer_phone, customer_email,
    workspace_id, destination, start_date, end_date, days, nights, adult_count, total_amount, status,
    handler_name, valid_until, issue_date, version, group_size, is_active, notes)
  VALUES
    (Q_CHUANDA, 'Q-2605-001', '創達電子 - 義大利瑞士獎勵旅遊 10 日', C_CHUANDA,
     '創達電子', '02-2655-1234', 'hr@chuanda.example',
     WS, '義大利+瑞士', '2026-09-15', '2026-09-24', 10, 9, 30, 4500000, 'confirmed',
     'William', '2026-06-30', '2026-05-05', 2, 30, true, 'Top 30 業務獎勵、需 5 星 + 米其林 3 餐');

  INSERT INTO public.quotes (id, code, name, customer_id, customer_name, customer_phone,
    workspace_id, destination, start_date, end_date, days, nights, adult_count, total_amount, status,
    handler_name, valid_until, issue_date, version, group_size, is_active, notes)
  VALUES
    (Q_CHEN, 'Q-2604-003', '陳大華 - 沖繩自由行 4 日', C_CHEN,
     '陳大華', '0933-555-666',
     WS, '日本沖繩', '2026-08-10', '2026-08-13', 4, 3, 2, 95000, 'cancelled',
     'William', '2026-05-30', '2026-04-20', 1, 2, true, '客戶因公司加班取消');

  -- ===== 旅遊團 3 個 =====
  INSERT INTO public.tours (id, workspace_id, code, name, departure_date, return_date, location,
    status, price, max_participants, current_participants, contract_status, total_revenue, total_cost,
    profit, is_active, archived, country_id, country_code, days_count, tour_service_type,
    closing_date, closed_by, locked_quote_id, locked_quote_version, selling_price_per_person)
  VALUES
    (TOUR_PAST, WS, 'T-2603-001', '力晶半導體 - 東京商務考察 5 日',
     '2026-04-01', '2026-04-05', '日本東京', 'closed', 64000, 20, 20, '已簽署',
     1280000, 920000, 360000, true, true, 'jp', 'JP', 5, 'tour_group',
     '2026-04-15', WILLIAM, Q_LIXIN, 3, 64000);

  INSERT INTO public.tours (id, workspace_id, code, name, departure_date, return_date, location,
    status, price, max_participants, current_participants, contract_status, total_revenue, total_cost,
    profit, is_active, archived, country_id, country_code, days_count, tour_service_type,
    selling_price_per_person)
  VALUES
    (TOUR_NOW, WS, 'T-2606-001', '力晶員工旅遊 - 東京箱根 6 日',
     '2026-06-15', '2026-06-20', '日本東京+箱根', 'upcoming', 78000, 30, 25, '簽署中',
     1950000, 1450000, 500000, true, false, 'jp', 'JP', 6, 'tour_group',
     78000);

  INSERT INTO public.tours (id, workspace_id, code, name, departure_date, return_date, location,
    status, price, max_participants, current_participants, contract_status, total_revenue, total_cost,
    profit, is_active, archived, country_id, country_code, days_count, tour_service_type,
    selling_price_per_person, description)
  VALUES
    (TOUR_OPEN, WS, 'T-2607-001', '沖繩夏日漫遊 4 日',
     '2026-07-20', '2026-07-23', '日本沖繩', 'proposal', 32000, 16, 12, '未簽署',
     384000, 264000, 120000, true, false, 'jp', 'JP', 4, 'tour_group',
     32000, '美麗海水族館、首里城、國際通、夏日海灘');

  -- ===== 訂單 6 張 =====
  INSERT INTO public.orders (id, workspace_id, code, tour_id, customer_id, contact_person, contact_phone,
    contact_email, adult_count, member_count, total_amount, paid_amount, remaining_amount, status,
    payment_status, tour_name, sales_person, departure_date, is_active, created_by)
  VALUES
    (ORD_PAST, WS, 'O-2603-001', TOUR_PAST, C_LIXIN,
     '力晶 HR 林經理', '03-579-9888', 'hr@lixin.example',
     20, 20, 1280000, 1280000, 0, 'completed', '已收齊',
     '力晶半導體 - 東京商務考察 5 日', 'William', '2026-04-01', true, WILLIAM);

  INSERT INTO public.orders (id, workspace_id, code, tour_id, customer_id, contact_person, contact_phone,
    contact_email, adult_count, member_count, total_amount, paid_amount, remaining_amount, status,
    payment_status, tour_name, sales_person, departure_date, is_active, created_by)
  VALUES
    (ORD_NOW1, WS, 'O-2606-001', TOUR_NOW, C_LIXIN,
     '力晶 HR 林經理', '03-579-9888', 'hr@lixin.example',
     22, 22, 1716000, 1372800, 343200, 'confirmed', '部分收款',
     '力晶員工旅遊 - 東京箱根 6 日', 'William', '2026-06-15', true, WILLIAM);

  INSERT INTO public.orders (id, workspace_id, code, tour_id, customer_id, contact_person, contact_phone,
    adult_count, member_count, total_amount, paid_amount, remaining_amount, status, payment_status,
    tour_name, sales_person, departure_date, is_active, created_by)
  VALUES
    (ORD_NOW2, WS, 'O-2606-002', TOUR_NOW, C_LI,
     '李美玉', '0922-111-222',
     3, 3, 234000, 70000, 164000, 'confirmed', '訂金已收',
     '力晶員工旅遊 - 東京箱根 6 日（眷屬）', 'William', '2026-06-15', true, WILLIAM);

  INSERT INTO public.orders (id, workspace_id, code, tour_id, customer_id, contact_person, contact_phone,
    adult_count, member_count, total_amount, paid_amount, remaining_amount, status, payment_status,
    tour_name, sales_person, departure_date, is_active, created_by)
  VALUES
    (ORD_OPEN1, WS, 'O-2607-001', TOUR_OPEN, C_WANG, '王小明', '0912-345-678',
     4, 4, 128000, 40000, 88000, 'pending', '訂金已收', '沖繩夏日漫遊 4 日', 'William', '2026-07-20', true, WILLIAM),
    (ORD_OPEN2, WS, 'O-2607-002', TOUR_OPEN, C_CHEN, '陳大華', '0933-555-666',
     2, 2, 64000, 0, 64000, 'pending', '未收款', '沖繩夏日漫遊 4 日', 'William', '2026-07-20', true, WILLIAM),
    (ORD_OPEN3, WS, 'O-2607-003', TOUR_OPEN, C_LI, '李美玉', '0922-111-222',
     6, 6, 192000, 96000, 96000, 'confirmed', '部分收款', '沖繩夏日漫遊 4 日', 'William', '2026-07-20', true, WILLIAM);

  -- ===== Order Members =====
  -- order_members.customer_id 留 NULL（避免 unique(order_id,customer_id) 衝突；customer 已存在 orders.customer_id）
  INSERT INTO public.order_members (order_id, tour_id, member_type, chinese_name,
    passport_name, gender, birth_date, total_payable, deposit_amount, balance_amount,
    cost_price, selling_price, profit, sort_order, workspace_id)
  VALUES
    (ORD_PAST, TOUR_PAST, 'adult', '林志明', 'LIN, CHIH-MING', 'M', '1978-05-12', 64000, 20000, 44000, 46000, 64000, 18000, 1, WS),
    (ORD_PAST, TOUR_PAST, 'adult', '陳怡君', 'CHEN, YI-CHUN', 'F', '1985-08-23', 64000, 20000, 44000, 46000, 64000, 18000, 2, WS),
    (ORD_PAST, TOUR_PAST, 'adult', '張家豪', 'CHANG, CHIA-HAO', 'M', '1990-03-15', 64000, 20000, 44000, 46000, 64000, 18000, 3, WS),
    (ORD_PAST, TOUR_PAST, 'adult', '黃小芳', 'HUANG, HSIAO-FANG', 'F', '1988-11-07', 64000, 20000, 44000, 46000, 64000, 18000, 4, WS),
    (ORD_PAST, TOUR_PAST, 'adult', '吳建宏', 'WU, CHIEN-HUNG', 'M', '1982-09-30', 64000, 20000, 44000, 46000, 64000, 18000, 5, WS),
    (ORD_NOW1, TOUR_NOW, 'adult', '王副總', 'WANG, CHIH-CHUNG', 'M', '1965-04-20', 78000, 30000, 48000, 58000, 78000, 20000, 1, WS),
    (ORD_NOW1, TOUR_NOW, 'adult', '李秘書', 'LI, MEI-LING', 'F', '1980-06-12', 78000, 30000, 48000, 58000, 78000, 20000, 2, WS),
    (ORD_NOW2, TOUR_NOW, 'adult', '李美玉', 'LI, MEI-YU', 'F', '1986-02-14', 78000, 30000, 48000, 58000, 78000, 20000, 1, WS),
    (ORD_NOW2, TOUR_NOW, 'child_a', '李小寶', 'LI, HSIAO-PAO', 'M', '2018-09-01', 78000, 30000, 48000, 58000, 78000, 20000, 2, WS),
    (ORD_NOW2, TOUR_NOW, 'adult', '李大寶', 'LI, TA-PAO', 'M', '1985-11-22', 78000, 10000, 68000, 58000, 78000, 20000, 3, WS),
    (ORD_OPEN1, TOUR_OPEN, 'adult', '王小明', 'WANG, HSIAO-MING', 'M', '1980-07-15', 32000, 10000, 22000, 22000, 32000, 10000, 1, WS),
    (ORD_OPEN1, TOUR_OPEN, 'adult', '王太太', 'WANG, MEI-LIN', 'F', '1982-09-01', 32000, 10000, 22000, 22000, 32000, 10000, 2, WS),
    (ORD_OPEN3, TOUR_OPEN, 'adult', '李美玉', 'LI, MEI-YU', 'F', '1986-02-14', 32000, 16000, 16000, 22000, 32000, 10000, 1, WS);

  -- ===== Receipts =====
  INSERT INTO public.receipts (receipt_number, order_id, customer_id, customer_name,
    payment_method, payment_method_id, payment_date, status, workspace_id,
    receipt_amount, actual_amount, receipt_type, tour_id, order_number, tour_name,
    accounting_subject_id, is_active, created_by, confirmed_at, confirmed_by)
  VALUES
    ('R-2603-001-D', ORD_PAST, C_LIXIN, '力晶半導體', 'transfer', PM_TRANSFER_R, '2026-03-20', 'confirmed', WS,
     400000, 400000, 1, TOUR_PAST, 'O-2603-001', '力晶半導體 - 東京商務考察 5 日',
     ACC_AR, true, WILLIAM, '2026-03-20T10:00:00+08:00', 'William'),
    ('R-2603-001-F', ORD_PAST, C_LIXIN, '力晶半導體', 'transfer', PM_TRANSFER_R, '2026-03-28', 'confirmed', WS,
     880000, 880000, 1, TOUR_PAST, 'O-2603-001', '力晶半導體 - 東京商務考察 5 日',
     ACC_REVENUE, true, WILLIAM, '2026-03-28T10:00:00+08:00', 'William'),
    ('R-2606-001-D', ORD_NOW1, C_LIXIN, '力晶半導體', 'transfer', PM_TRANSFER_R, '2026-05-10', 'confirmed', WS,
     1372800, 1372800, 1, TOUR_NOW, 'O-2606-001', '力晶員工旅遊 - 東京箱根 6 日',
     ACC_AR, true, WILLIAM, '2026-05-10T15:30:00+08:00', 'William'),
    ('R-2606-002-D', ORD_NOW2, C_LI, '李美玉', 'card', PM_CARD_R, '2026-05-09', 'confirmed', WS,
     70000, 70000, 1, TOUR_NOW, 'O-2606-002', '力晶員工旅遊 - 東京箱根 6 日（眷屬）',
     ACC_AR, true, WILLIAM, '2026-05-09T16:00:00+08:00', 'William'),
    ('R-2607-001-D', ORD_OPEN1, C_WANG, '王小明', 'cash', PM_CASH_R, '2026-05-05', 'confirmed', WS,
     40000, 40000, 1, TOUR_OPEN, 'O-2607-001', '沖繩夏日漫遊 4 日',
     ACC_AR, true, WILLIAM, '2026-05-05T11:00:00+08:00', 'William'),
    ('R-2607-003-D', ORD_OPEN3, C_LI, '李美玉', 'transfer', PM_TRANSFER_R, '2026-05-08', 'confirmed', WS,
     96000, 96000, 1, TOUR_OPEN, 'O-2607-003', '沖繩夏日漫遊 4 日',
     ACC_AR, true, WILLIAM, '2026-05-08T14:00:00+08:00', 'William');

  -- ===== Payment Requests =====
  INSERT INTO public.payment_requests (code, tour_id, request_type, amount, supplier_name,
    status, workspace_id, request_date, total_amount, tour_code, tour_name, created_by, notes,
    order_id, order_number, request_category, paid_at, paid_by, accounting_subject_id, payment_method_id)
  VALUES
    ('P-2603-001-A', TOUR_PAST, 'flight', 380000, 'JAL 日本航空', 'paid', WS, '2026-03-20', 380000,
     'T-2603-001', '力晶半導體 - 東京商務考察 5 日', WILLIAM, '機票 20 張、商務艙', ORD_PAST, 'O-2603-001', 'tour',
     '2026-03-25T10:00:00+08:00', WILLIAM, ACC_COST, PM_TRANSFER_P),
    ('P-2603-001-B', TOUR_PAST, 'hotel', 320000, 'Park Hyatt Tokyo', 'paid', WS, '2026-03-22', 320000,
     'T-2603-001', '力晶半導體 - 東京商務考察 5 日', WILLIAM, '4 晚 10 房', ORD_PAST, 'O-2603-001', 'tour',
     '2026-03-30T10:00:00+08:00', WILLIAM, ACC_COST, PM_TRANSFER_P),
    ('P-2603-001-C', TOUR_PAST, 'transport', 80000, '東京観光バス', 'paid', WS, '2026-03-28', 80000,
     'T-2603-001', '力晶半導體 - 東京商務考察 5 日', WILLIAM, '5 日專車', ORD_PAST, 'O-2603-001', 'tour',
     '2026-04-08T10:00:00+08:00', WILLIAM, ACC_COST, PM_TRANSFER_P),
    ('P-2603-001-D', TOUR_PAST, 'meal', 90000, '東京三家米其林餐廳', 'paid', WS, '2026-03-30', 90000,
     'T-2603-001', '力晶半導體 - 東京商務考察 5 日', WILLIAM, '商務晚宴 3 場', ORD_PAST, 'O-2603-001', 'tour',
     '2026-04-10T10:00:00+08:00', WILLIAM, ACC_COST, PM_TRANSFER_P),
    ('P-2603-001-E', TOUR_PAST, 'service', 50000, '在地導遊張先生', 'paid', WS, '2026-04-05', 50000,
     'T-2603-001', '力晶半導體 - 東京商務考察 5 日', WILLIAM, '5 日全程導遊費', ORD_PAST, 'O-2603-001', 'tour',
     '2026-04-12T10:00:00+08:00', WILLIAM, ACC_EXPENSE, PM_TRANSFER_P);

  INSERT INTO public.payment_requests (code, tour_id, request_type, amount, supplier_name,
    status, workspace_id, request_date, total_amount, tour_code, tour_name, created_by, notes,
    order_id, order_number, request_category, accounting_subject_id, payment_method_id)
  VALUES
    ('P-2606-001-A', TOUR_NOW, 'flight', 600000, 'JAL 日本航空', 'pending', WS, '2026-05-10', 600000,
     'T-2606-001', '力晶員工旅遊 - 東京箱根 6 日', WILLIAM, '機票 25 張', ORD_NOW1, 'O-2606-001', 'tour',
     ACC_COST, PM_TRANSFER_P),
    ('P-2606-001-B', TOUR_NOW, 'hotel', 500000, '箱根強羅花壇', 'pending', WS, '2026-05-10', 500000,
     'T-2606-001', '力晶員工旅遊 - 東京箱根 6 日', WILLIAM, '5 晚 13 房', ORD_NOW1, 'O-2606-001', 'tour',
     ACC_COST, PM_TRANSFER_P);

  -- ===== Journal Vouchers + Lines (結案傳票) =====
  INSERT INTO public.journal_vouchers (id, workspace_id, voucher_no, voucher_date, memo,
    status, total_debit, total_credit, created_by, source_type, event_id)
  VALUES (gen_random_uuid(), WS, 'JV-2604-001', '2026-04-15',
    '結案：T-2603-001 力晶東京 5 日 - 收入確認', 'posted', 1280000, 1280000, WILLIAM,
    'tour_close', gen_random_uuid())
  RETURNING id INTO V_REVENUE;

  INSERT INTO public.journal_lines (voucher_id, line_no, account_id, description, debit_amount, credit_amount)
  VALUES
    (V_REVENUE, 1, ACC_CASH, '力晶半導體入帳（收齊）', 1280000, 0),
    (V_REVENUE, 2, ACC_REVENUE, '東京 5 日商務團收入', 0, 1280000);

  INSERT INTO public.journal_vouchers (id, workspace_id, voucher_no, voucher_date, memo,
    status, total_debit, total_credit, created_by, source_type, event_id)
  VALUES (gen_random_uuid(), WS, 'JV-2604-002', '2026-04-15',
    '結案：T-2603-001 力晶東京 5 日 - 成本歸集', 'posted', 920000, 920000, WILLIAM,
    'tour_close', gen_random_uuid())
  RETURNING id INTO V_COST;

  INSERT INTO public.journal_lines (voucher_id, line_no, account_id, description, debit_amount, credit_amount)
  VALUES
    (V_COST, 1, ACC_COST, '機票/飯店/車輛/餐廳成本', 870000, 0),
    (V_COST, 2, ACC_EXPENSE, '導遊費', 50000, 0),
    (V_COST, 3, ACC_CASH, '對外付款匯總', 0, 920000);

  -- ===== Accounting Period Closing =====
  INSERT INTO public.accounting_period_closings (workspace_id, period_type, period_start, period_end,
    closing_voucher_id, net_income, closed_by, closed_at)
  VALUES (WS, 'month', '2026-04-01', '2026-04-30', V_REVENUE, 360000, WILLIAM, '2026-05-02T10:00:00+08:00');

  -- ===== Tour Departure Data =====
  INSERT INTO public.tour_departure_data (tour_id, flight_info, hotel_info, bus_info, guide_info, emergency_contact, notes, created_by)
  VALUES (TOUR_NOW,
    '{"outbound": "JL802 TPE 09:30 -> NRT 13:40", "return": "JL811 NRT 18:30 -> TPE 21:30"}'::jsonb,
    '{"day1_2": "Park Hyatt Tokyo", "day3_4": "箱根強羅花壇", "day5": "Park Hyatt Tokyo"}'::jsonb,
    '{"company": "東京観光バス", "contact": "山田 +81-90-1234-5678"}'::jsonb,
    '{"name": "張一郎", "phone": "+81-80-9876-5432", "language": "中文/日文"}'::jsonb,
    '{"local": "+81-3-1234-5678", "agency": "0800-088-688"}'::jsonb,
    '飛機餐特別餐：5 位素食、2 位無豬肉', WILLIAM
  );

  -- ===== Tour Bonus =====
  INSERT INTO public.tour_bonus_settings (workspace_id, tour_id, type, bonus, bonus_type, employee_id, description, created_by)
  VALUES
    (WS, TOUR_PAST, 1, 30000, 1, WILLIAM, '業務獎金 - 王威廉', WILLIAM),
    (WS, TOUR_PAST, 2, 10000, 1, WILLIAM, '領隊津貼', WILLIAM);

  -- ===== Contracts =====
  INSERT INTO public.contracts (workspace_id, tour_id, code, template, signer_type, signer_name,
    signer_phone, company_name, company_tax_id, company_representative, status, created_by, order_id)
  VALUES
    (WS, TOUR_NOW, 'CT-2606-001', 'corporate', 'company', NULL,
     '03-579-9888', '力晶半導體股份有限公司', '12345678', '王副總', 'sent', WILLIAM, ORD_NOW1),
    (WS, TOUR_PAST, 'CT-2603-001', 'corporate', 'company', NULL,
     '03-579-9888', '力晶半導體股份有限公司', '12345678', '林副總', 'signed', WILLIAM, ORD_PAST);

  RAISE NOTICE 'Demo seed v2 OK: 5 customers / 4 quotes / 3 tours / 6 orders / 13 members / 6 receipts / 7 payment_requests / 2 vouchers + 5 lines / 1 period close / 2 contracts';
END $$;
