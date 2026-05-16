-- =============================================
-- Migration: 修 19 張業務表 RLS policy + 清 itineraries/messages 舊 policy 殘留（E2）
-- 2026-05-02
--
-- 背景（D1 audit / policy_audit.md）：
--   Class B1：19 張業務表 policy 用 `auth.role() = 'authenticated'` 或 `true`
--             → 任何登入用戶可跨租戶讀寫
--   Class P4：itineraries / messages 有舊+新 policy 並存、INSERT 為 OR 關係
--             → 舊版 deprecated policy（auth.uid() IS NOT NULL / channel_members EXISTS）
--                讓任何登入用戶能 INSERT 到任何 workspace_id 的 row
--
-- 依賴：
--   E1 migration（20260502200000_fix_platform_admin_and_user_id）
--   修好 is_super_admin() 從 stub 變成真實邏輯（workspace admin role）
--   及把 employees.user_id 從 supabase_user_id 補齊
--   本 migration 引用的 is_super_admin / has_capability_for_workspace 都依此
--
-- 策略分組（針對 schema 現實調整、憲法 4-policy ERP 變體）：
--
--   Group A: 5 張 schema 有 workspace_id 的表 → 標準 4-policy ERP
--     - itineraries, messages, michelin_restaurants, premium_experiences, todo_columns
--
--   Group B: 3 張 tour 子表（透過 tours.workspace_id 守租戶）
--     - tour_custom_cost_fields, tour_departure_data, tour_member_fields
--     - subquery: EXISTS (tours WHERE tours.id = X.tour_id AND has_capability_for_workspace(tours.workspace_id, ...))
--
--   Group C: 3 張 channel 子表（透過 channels.workspace_id 守租戶）
--     - advance_lists, shared_order_lists（直接掛 channel_id）
--     - advance_items（→ advance_lists → channel_id）
--     - 注意：channels 模組已凍結（CLAUDE.md Section 10.16）、但表結構還在、
--       仍須清掉 Class B1 漏洞、避免凍結期任意寫入
--
--   Group D: 6 張 reference data 表（無 workspace_id、跨租戶共用）
--     - hotels, restaurants, supplier_categories, tour_destinations, tour_leaders, vendor_costs
--     - 策略：authenticated SELECT 開放、寫入只給 super admin
--     - 為何不加 workspace_id：實務上是平台維護的供應商資料庫、各租戶共讀、
--       後續若要改租戶私有需獨立規劃（schema 變更 + 資料遷移）、超出本 migration 範圍
--
--   Group E: 2 張個人記帳表（用 user_id 守自己）
--     - accounting_transactions（純個人記帳、總是 user_id 過濾）
--     - expense_categories（個人類別、52/53 是 NULL 全域類別、1/53 是 user 私有）
--
--   Group F: 2 張無明確租戶/個人標識（鎖死、auth read + super_admin write）
--     - tasks（12 row、僅 ad-hoc 任務管理、無 workspace_id 也無 user_id）
--     - cost_templates（成本範本、無 workspace_id、視為平台共用）
--
-- 不動（E1 / E3 範圍 / 已凍結）：
--   - is_super_admin() / has_capability_for_workspace（E1）
--   - admin client API code（E3）
--   - channels / channel_members 表本身（凍結中、但 messages 殘留要清）
--   - workspaces（憲法紅線、不准 FORCE RLS）
-- =============================================

BEGIN;

-- ============================================================
-- 通用：DROP 既有 policy（用 IF EXISTS 防漏）
-- ============================================================

-- Group A: workspace_id 直接守
DROP POLICY IF EXISTS "itineraries_select" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_insert" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_update" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_delete" ON public.itineraries;
DROP POLICY IF EXISTS "Authenticated users can insert itineraries" ON public.itineraries;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
DROP POLICY IF EXISTS "Allow channel members to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow members to read messages" ON public.messages;

DROP POLICY IF EXISTS "michelin_restaurants_select" ON public.michelin_restaurants;
DROP POLICY IF EXISTS "michelin_restaurants_insert" ON public.michelin_restaurants;
DROP POLICY IF EXISTS "michelin_restaurants_update" ON public.michelin_restaurants;
DROP POLICY IF EXISTS "michelin_restaurants_delete" ON public.michelin_restaurants;
DROP POLICY IF EXISTS "michelin_select" ON public.michelin_restaurants;
DROP POLICY IF EXISTS "michelin_write" ON public.michelin_restaurants;

DROP POLICY IF EXISTS "premium_experiences_select" ON public.premium_experiences;
DROP POLICY IF EXISTS "premium_experiences_insert" ON public.premium_experiences;
DROP POLICY IF EXISTS "premium_experiences_update" ON public.premium_experiences;
DROP POLICY IF EXISTS "premium_experiences_delete" ON public.premium_experiences;
DROP POLICY IF EXISTS "premium_select" ON public.premium_experiences;
DROP POLICY IF EXISTS "premium_write" ON public.premium_experiences;

DROP POLICY IF EXISTS "todo_columns_workspace_access" ON public.todo_columns;
DROP POLICY IF EXISTS "todo_columns_select" ON public.todo_columns;
DROP POLICY IF EXISTS "todo_columns_insert" ON public.todo_columns;
DROP POLICY IF EXISTS "todo_columns_update" ON public.todo_columns;
DROP POLICY IF EXISTS "todo_columns_delete" ON public.todo_columns;

-- Group B: tour 子表
DROP POLICY IF EXISTS "tour_custom_cost_fields_authenticated" ON public.tour_custom_cost_fields;
DROP POLICY IF EXISTS "tour_custom_cost_fields_select" ON public.tour_custom_cost_fields;
DROP POLICY IF EXISTS "tour_custom_cost_fields_insert" ON public.tour_custom_cost_fields;
DROP POLICY IF EXISTS "tour_custom_cost_fields_update" ON public.tour_custom_cost_fields;
DROP POLICY IF EXISTS "tour_custom_cost_fields_delete" ON public.tour_custom_cost_fields;

DROP POLICY IF EXISTS "tour_departure_data_authenticated" ON public.tour_departure_data;
DROP POLICY IF EXISTS "tour_departure_data_select" ON public.tour_departure_data;
DROP POLICY IF EXISTS "tour_departure_data_insert" ON public.tour_departure_data;
DROP POLICY IF EXISTS "tour_departure_data_update" ON public.tour_departure_data;
DROP POLICY IF EXISTS "tour_departure_data_delete" ON public.tour_departure_data;

DROP POLICY IF EXISTS "tour_member_fields_authenticated" ON public.tour_member_fields;
DROP POLICY IF EXISTS "tour_member_fields_select" ON public.tour_member_fields;
DROP POLICY IF EXISTS "tour_member_fields_insert" ON public.tour_member_fields;
DROP POLICY IF EXISTS "tour_member_fields_update" ON public.tour_member_fields;
DROP POLICY IF EXISTS "tour_member_fields_delete" ON public.tour_member_fields;

-- Group C: channel 子表
DROP POLICY IF EXISTS "advance_lists_authenticated" ON public.advance_lists;
DROP POLICY IF EXISTS "advance_lists_select" ON public.advance_lists;
DROP POLICY IF EXISTS "advance_lists_insert" ON public.advance_lists;
DROP POLICY IF EXISTS "advance_lists_update" ON public.advance_lists;
DROP POLICY IF EXISTS "advance_lists_delete" ON public.advance_lists;

DROP POLICY IF EXISTS "advance_items_authenticated" ON public.advance_items;
DROP POLICY IF EXISTS "advance_items_select" ON public.advance_items;
DROP POLICY IF EXISTS "advance_items_insert" ON public.advance_items;
DROP POLICY IF EXISTS "advance_items_update" ON public.advance_items;
DROP POLICY IF EXISTS "advance_items_delete" ON public.advance_items;

DROP POLICY IF EXISTS "shared_order_lists_authenticated" ON public.shared_order_lists;
DROP POLICY IF EXISTS "shared_order_lists_select" ON public.shared_order_lists;
DROP POLICY IF EXISTS "shared_order_lists_insert" ON public.shared_order_lists;
DROP POLICY IF EXISTS "shared_order_lists_update" ON public.shared_order_lists;
DROP POLICY IF EXISTS "shared_order_lists_delete" ON public.shared_order_lists;

-- Group D: reference data
DROP POLICY IF EXISTS "hotels_authenticated" ON public.hotels;
DROP POLICY IF EXISTS "hotels_select" ON public.hotels;
DROP POLICY IF EXISTS "hotels_insert" ON public.hotels;
DROP POLICY IF EXISTS "hotels_update" ON public.hotels;
DROP POLICY IF EXISTS "hotels_delete" ON public.hotels;

DROP POLICY IF EXISTS "restaurants_select" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_insert" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_update" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_delete" ON public.restaurants;

DROP POLICY IF EXISTS "supplier_categories_select" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_insert" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_update" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_delete" ON public.supplier_categories;

DROP POLICY IF EXISTS "tour_destinations_select" ON public.tour_destinations;
DROP POLICY IF EXISTS "tour_destinations_insert" ON public.tour_destinations;
DROP POLICY IF EXISTS "tour_destinations_update" ON public.tour_destinations;
DROP POLICY IF EXISTS "tour_destinations_delete" ON public.tour_destinations;

DROP POLICY IF EXISTS "tour_leaders_select" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_insert" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_update" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_delete" ON public.tour_leaders;

DROP POLICY IF EXISTS "vendor_costs_select" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_insert" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_update" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_delete" ON public.vendor_costs;

-- Group E: 個人記帳
DROP POLICY IF EXISTS "accounting_transactions_authenticated" ON public.accounting_transactions;
DROP POLICY IF EXISTS "accounting_transactions_select" ON public.accounting_transactions;
DROP POLICY IF EXISTS "accounting_transactions_insert" ON public.accounting_transactions;
DROP POLICY IF EXISTS "accounting_transactions_update" ON public.accounting_transactions;
DROP POLICY IF EXISTS "accounting_transactions_delete" ON public.accounting_transactions;

DROP POLICY IF EXISTS "expense_categories_authenticated_access" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_select" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_insert" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_update" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_delete" ON public.expense_categories;

-- Group F: 鎖死
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

DROP POLICY IF EXISTS "cost_templates_authenticated" ON public.cost_templates;
DROP POLICY IF EXISTS "cost_templates_select" ON public.cost_templates;
DROP POLICY IF EXISTS "cost_templates_insert" ON public.cost_templates;
DROP POLICY IF EXISTS "cost_templates_update" ON public.cost_templates;
DROP POLICY IF EXISTS "cost_templates_delete" ON public.cost_templates;

-- ============================================================
-- 確保 RLS enabled（D1 已確認 21 張表都 enabled、這裡 idempotent 補保險）
-- ============================================================

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.michelin_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_custom_cost_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_departure_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_member_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_order_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Group A: 5 張 workspace_id 直接守 → 標準 4-policy ERP
-- ============================================================

-- itineraries (module: tours)
CREATE POLICY "itineraries_select" ON public.itineraries
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'tours.read')
    OR workspace_id = (SELECT e.workspace_id FROM public.employees e
                        WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                        LIMIT 1)
  );
CREATE POLICY "itineraries_insert" ON public.itineraries
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'tours.write')
  );
CREATE POLICY "itineraries_update" ON public.itineraries
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'tours.write')
  )
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'tours.write')
  );
CREATE POLICY "itineraries_delete" ON public.itineraries
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'tours.write')
  );

-- messages (module: channel — 凍結模組、但表存在、清舊 policy 防範意外寫入)
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'channel.read')
    OR workspace_id = (SELECT e.workspace_id FROM public.employees e
                        WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                        LIMIT 1)
  );
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'channel.write')
  );
CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'channel.write')
  )
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'channel.write')
  );
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'channel.write')
  );

-- michelin_restaurants (module: database — 平台共享資料庫、寫入需 super admin)
-- 雖然有 workspace_id 欄位、但實務上是平台維護資料、各租戶共讀
CREATE POLICY "michelin_restaurants_select" ON public.michelin_restaurants
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.read')
    OR workspace_id = (SELECT e.workspace_id FROM public.employees e
                        WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                        LIMIT 1)
  );
CREATE POLICY "michelin_restaurants_insert" ON public.michelin_restaurants
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  );
CREATE POLICY "michelin_restaurants_update" ON public.michelin_restaurants
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  )
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  );
CREATE POLICY "michelin_restaurants_delete" ON public.michelin_restaurants
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  );

-- premium_experiences (module: database)
CREATE POLICY "premium_experiences_select" ON public.premium_experiences
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.read')
    OR workspace_id = (SELECT e.workspace_id FROM public.employees e
                        WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                        LIMIT 1)
  );
CREATE POLICY "premium_experiences_insert" ON public.premium_experiences
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  );
CREATE POLICY "premium_experiences_update" ON public.premium_experiences
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  )
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  );
CREATE POLICY "premium_experiences_delete" ON public.premium_experiences
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.write')
  );

-- todo_columns (module: todos)
CREATE POLICY "todo_columns_select" ON public.todo_columns
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'todos.read')
    OR workspace_id = (SELECT e.workspace_id FROM public.employees e
                        WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                        LIMIT 1)
  );
CREATE POLICY "todo_columns_insert" ON public.todo_columns
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'todos.write')
  );
CREATE POLICY "todo_columns_update" ON public.todo_columns
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'todos.write')
  )
  WITH CHECK (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'todos.write')
  );
CREATE POLICY "todo_columns_delete" ON public.todo_columns
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'todos.write')
  );

-- ============================================================
-- Group B: 3 張 tour 子表（透過 tours.workspace_id 守租戶）
-- ============================================================

-- tour_custom_cost_fields (module: tours)
CREATE POLICY "tour_custom_cost_fields_select" ON public.tour_custom_cost_fields
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_custom_cost_fields.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read')
          OR t.workspace_id = (SELECT e.workspace_id FROM public.employees e
                                WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                                LIMIT 1)
        )
    )
  );
CREATE POLICY "tour_custom_cost_fields_insert" ON public.tour_custom_cost_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_custom_cost_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );
CREATE POLICY "tour_custom_cost_fields_update" ON public.tour_custom_cost_fields
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_custom_cost_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_custom_cost_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );
CREATE POLICY "tour_custom_cost_fields_delete" ON public.tour_custom_cost_fields
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_custom_cost_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );

-- tour_departure_data (module: tours)
CREATE POLICY "tour_departure_data_select" ON public.tour_departure_data
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_departure_data.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read')
          OR t.workspace_id = (SELECT e.workspace_id FROM public.employees e
                                WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                                LIMIT 1)
        )
    )
  );
CREATE POLICY "tour_departure_data_insert" ON public.tour_departure_data
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_departure_data.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );
CREATE POLICY "tour_departure_data_update" ON public.tour_departure_data
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_departure_data.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_departure_data.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );
CREATE POLICY "tour_departure_data_delete" ON public.tour_departure_data
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_departure_data.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );

-- tour_member_fields (module: tours)
CREATE POLICY "tour_member_fields_select" ON public.tour_member_fields
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_member_fields.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read')
          OR t.workspace_id = (SELECT e.workspace_id FROM public.employees e
                                WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                                LIMIT 1)
        )
    )
  );
CREATE POLICY "tour_member_fields_insert" ON public.tour_member_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_member_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );
CREATE POLICY "tour_member_fields_update" ON public.tour_member_fields
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_member_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_member_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );
CREATE POLICY "tour_member_fields_delete" ON public.tour_member_fields
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_member_fields.tour_id
        AND has_capability_for_workspace(t.workspace_id, 'tours.write')
    )
  );

-- ============================================================
-- Group C: 3 張 channel 子表（透過 channels.workspace_id 守租戶）
-- 注意：channel 模組已凍結（CLAUDE.md 10.16）、但這些表已存在、需清漏洞
-- ============================================================

-- advance_lists (channel_id → channels.workspace_id; module: finance)
CREATE POLICY "advance_lists_select" ON public.advance_lists
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = advance_lists.channel_id
        AND (
          has_capability_for_workspace(c.workspace_id, 'finance.read')
          OR c.workspace_id = (SELECT e.workspace_id FROM public.employees e
                                WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                                LIMIT 1)
        )
    )
  );
CREATE POLICY "advance_lists_insert" ON public.advance_lists
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = advance_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  );
CREATE POLICY "advance_lists_update" ON public.advance_lists
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = advance_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = advance_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  );
CREATE POLICY "advance_lists_delete" ON public.advance_lists
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = advance_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  );

-- advance_items (advance_list_id → advance_lists.channel_id → channels.workspace_id)
CREATE POLICY "advance_items_select" ON public.advance_items
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.advance_lists al
      JOIN public.channels c ON c.id = al.channel_id
      WHERE al.id = advance_items.advance_list_id
        AND (
          has_capability_for_workspace(c.workspace_id, 'finance.read')
          OR c.workspace_id = (SELECT e.workspace_id FROM public.employees e
                                WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                                LIMIT 1)
        )
    )
  );
CREATE POLICY "advance_items_insert" ON public.advance_items
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.advance_lists al
      JOIN public.channels c ON c.id = al.channel_id
      WHERE al.id = advance_items.advance_list_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  );
CREATE POLICY "advance_items_update" ON public.advance_items
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.advance_lists al
      JOIN public.channels c ON c.id = al.channel_id
      WHERE al.id = advance_items.advance_list_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.advance_lists al
      JOIN public.channels c ON c.id = al.channel_id
      WHERE al.id = advance_items.advance_list_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  );
CREATE POLICY "advance_items_delete" ON public.advance_items
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.advance_lists al
      JOIN public.channels c ON c.id = al.channel_id
      WHERE al.id = advance_items.advance_list_id
        AND has_capability_for_workspace(c.workspace_id, 'finance.write')
    )
  );

-- shared_order_lists (channel_id → channels.workspace_id; module: orders)
CREATE POLICY "shared_order_lists_select" ON public.shared_order_lists
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = shared_order_lists.channel_id
        AND (
          has_capability_for_workspace(c.workspace_id, 'orders.read')
          OR c.workspace_id = (SELECT e.workspace_id FROM public.employees e
                                WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
                                LIMIT 1)
        )
    )
  );
CREATE POLICY "shared_order_lists_insert" ON public.shared_order_lists
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = shared_order_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'orders.write')
    )
  );
CREATE POLICY "shared_order_lists_update" ON public.shared_order_lists
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = shared_order_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'orders.write')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = shared_order_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'orders.write')
    )
  );
CREATE POLICY "shared_order_lists_delete" ON public.shared_order_lists
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = shared_order_lists.channel_id
        AND has_capability_for_workspace(c.workspace_id, 'orders.write')
    )
  );

-- ============================================================
-- Group D: 6 張 reference data 表（無 workspace_id、跨租戶共用）
-- 策略：authenticated SELECT 開放、寫入只給 super admin
-- 雖偏離標準 4-policy ERP（沒 workspace_id 沒法 capability 守 workspace）、
-- 但這些表現況就是平台共享資料庫、改成租戶私有需獨立 schema migration
-- ============================================================

-- hotels (module: database — 共享供應商資料)
CREATE POLICY "hotels_select" ON public.hotels
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "hotels_insert" ON public.hotels
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "hotels_update" ON public.hotels
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "hotels_delete" ON public.hotels
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- restaurants
CREATE POLICY "restaurants_select" ON public.restaurants
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "restaurants_insert" ON public.restaurants
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "restaurants_update" ON public.restaurants
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "restaurants_delete" ON public.restaurants
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- supplier_categories
CREATE POLICY "supplier_categories_select" ON public.supplier_categories
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "supplier_categories_insert" ON public.supplier_categories
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "supplier_categories_update" ON public.supplier_categories
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "supplier_categories_delete" ON public.supplier_categories
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- tour_destinations
CREATE POLICY "tour_destinations_select" ON public.tour_destinations
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "tour_destinations_insert" ON public.tour_destinations
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "tour_destinations_update" ON public.tour_destinations
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "tour_destinations_delete" ON public.tour_destinations
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- tour_leaders
CREATE POLICY "tour_leaders_select" ON public.tour_leaders
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "tour_leaders_insert" ON public.tour_leaders
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "tour_leaders_update" ON public.tour_leaders
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "tour_leaders_delete" ON public.tour_leaders
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- vendor_costs
CREATE POLICY "vendor_costs_select" ON public.vendor_costs
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "vendor_costs_insert" ON public.vendor_costs
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "vendor_costs_update" ON public.vendor_costs
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "vendor_costs_delete" ON public.vendor_costs
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ============================================================
-- Group E: 2 張個人記帳表（user_id 守自己）
-- ============================================================

-- accounting_transactions (純個人記帳、user_id NOT NULL 應該由 application 守)
-- 0 row、不需 backfill
CREATE POLICY "accounting_transactions_select" ON public.accounting_transactions
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
  );
CREATE POLICY "accounting_transactions_insert" ON public.accounting_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR user_id = auth.uid()
  );
CREATE POLICY "accounting_transactions_update" ON public.accounting_transactions
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
  )
  WITH CHECK (
    is_super_admin()
    OR user_id = auth.uid()
  );
CREATE POLICY "accounting_transactions_delete" ON public.accounting_transactions
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
  );

-- expense_categories (52/53 user_id NULL = 全域系統類別、1/53 私有)
-- SELECT 開放（讓系統類別所有人可見）；寫入要嘛自己的、要嘛 super admin
CREATE POLICY "expense_categories_select" ON public.expense_categories
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR user_id IS NULL  -- 系統共享類別
    OR user_id = auth.uid()
  );
CREATE POLICY "expense_categories_insert" ON public.expense_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR user_id = auth.uid()
  );
CREATE POLICY "expense_categories_update" ON public.expense_categories
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
  )
  WITH CHECK (
    is_super_admin()
    OR user_id = auth.uid()
  );
CREATE POLICY "expense_categories_delete" ON public.expense_categories
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
  );

-- ============================================================
-- Group F: 2 張無明確租戶/個人標識的表（鎖死）
-- ============================================================

-- tasks（12 row、無 workspace_id 也無 user_id；功能性殘留）
-- 只允許 super admin 寫、authenticated 讀（保持現有 12 row 可見）
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- cost_templates（0 row、無 workspace_id；視為平台共用範本）
CREATE POLICY "cost_templates_select" ON public.cost_templates
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "cost_templates_insert" ON public.cost_templates
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY "cost_templates_update" ON public.cost_templates
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY "cost_templates_delete" ON public.cost_templates
  FOR DELETE TO authenticated
  USING (is_super_admin());

COMMIT;

-- =============================================
-- 寫入 schema_migrations
-- =============================================
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260502210000', 'fix_rls_policies_19_tables', NULL)
ON CONFLICT (version) DO NOTHING;
