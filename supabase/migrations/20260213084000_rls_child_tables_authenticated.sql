-- Enable RLS on child/reference tables that don't have workspace_id
-- These tables are accessed through parent tables (tours, orders, etc.)
-- Basic protection: only authenticated users can access

DO $$
DECLARE
  tbl text;
  child_tables text[] := ARRAY[
    'accounting_accounts','accounting_categories','accounting_entries',
    'accounting_transactions','accounts','advance_items','advance_lists',
    'budgets','cost_templates','customer_badges','customer_travel_cards',
    'disbursement_requests','hotels','online_trip_members',
    'price_list_items','quote_versions','receipt_payment_items',
    'shared_order_lists','supplier_categories','supplier_payment_accounts',
    'supplier_price_list','supplier_service_areas','system_settings',
    'tour_custom_cost_fields','tour_custom_cost_values','tour_departure_data',
    'tour_member_fields','tour_members','tour_refunds',
    'tour_request_items','tour_request_member_vouchers','tour_request_messages',
    'tour_room_assignments','tour_rooms','tour_vehicle_assignments',
    'tour_vehicles','transactions','traveler_badges','user_badges',
    'user_roles','voucher_entries','workspace_items','workspaces'
  ];
BEGIN
  FOREACH tbl IN ARRAY child_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated" ON public.%I', tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "%s_authenticated" ON public.%I FOR ALL USING (auth.role() = ''authenticated'')',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;
