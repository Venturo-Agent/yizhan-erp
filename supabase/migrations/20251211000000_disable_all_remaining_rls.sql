-- Disable RLS on all remaining tables
-- Based on Supabase Dashboard showing 107 RLS errors
-- Venturo doesn't use RLS (as per CLAUDE.md and RLS_REMOVAL_SUMMARY.md)

BEGIN;

-- Disable RLS on all tables with errors shown in dashboard
ALTER TABLE IF EXISTS public.advance_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bulletins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.channel_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.countries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.itineraries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

-- Additional tables that may have RLS enabled
ALTER TABLE IF EXISTS public.tours DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.itinerary_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.finance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.todos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.esims DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tour_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.refunds DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ledgers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.linkpay_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.confirmations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disbursements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.personal_canvases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.destinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.airlines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cost_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.price_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank_codes DISABLE ROW LEVEL SECURITY;

-- Additional tables from recent migrations
ALTER TABLE IF EXISTS public.disbursement_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_request_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tour_addons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_usage_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transportation_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usa_esta DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timebox_boxes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timebox_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.image_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attractions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.itinerary_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.channel_threads DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy % on table %', r.policyname, r.tablename;
  END LOOP;
END $$;

COMMIT;

-- Verification
DO $$
DECLARE
  rls_enabled_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' AND c.relrowsecurity = true;

  -- Count remaining policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS Cleanup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Results:';
  RAISE NOTICE '  • Tables with RLS enabled: %', rls_enabled_count;
  RAISE NOTICE '  • Remaining RLS policies: %', policy_count;
  RAISE NOTICE '';

  IF rls_enabled_count > 0 OR policy_count > 0 THEN
    RAISE WARNING '⚠️  Some tables still have RLS enabled or policies remaining';
  ELSE
    RAISE NOTICE '✅ All RLS has been successfully disabled!';
  END IF;

  RAISE NOTICE '========================================';
END $$;
