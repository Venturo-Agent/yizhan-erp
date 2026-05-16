-- Add auto_set_workspace_id trigger to all remaining tables with workspace_id column
-- that don't already have the trigger.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'accounting_events','accounting_period_closings','accounting_periods','accounting_subjects',
    'ai_conversations','ai_memories','ai_settings','airport_images','attendance_records',
    'attractions','background_tasks','body_measurements','brochure_documents','channel_members',
    'chart_of_accounts','cities','companies','company_announcements','company_asset_folders',
    'company_assets','company_contacts','confirmations','countries','customer_assigned_itineraries',
    'customer_groups','customization_requests','design_templates','designer_drafts','driver_tasks',
    'email_accounts','email_attachments','emails','employees','erp_bank_accounts','esims',
    'eyeline_submissions','files','fitness_goals','fleet_drivers','fleet_schedules',
    'fleet_vehicle_logs','fleet_vehicles','flight_status_subscriptions','folders','general_ledger',
    'image_library','invoice_orders','itinerary_documents','journal_vouchers','leader_availability',
    'leader_schedules','leave_balances','leave_requests','leave_types','linkpay_logs','members',
    'notes','office_documents','online_trips','order_members','payment_request_items',
    'payroll_periods','payroll_records','personal_canvases','personal_records','pnr_ai_queries',
    'pnr_fare_alerts','pnr_fare_history','pnr_flight_status_history','pnr_queue_items',
    'pnr_records','pnr_schedule_changes','posting_rules','profiles','progress_photos',
    'quote_confirmation_logs','quote_items','receipt_items','receipt_orders','ref_airports',
    'regions','request_response_items','rich_documents','supplier_employees','suppliers',
    'tour_addons','tour_confirmation_items','tour_confirmation_sheets','tour_control_forms',
    'tour_folder_templates','tour_meal_settings','tour_tables','transportation_rates',
    'travel_invoices','traveler_conversations','usa_esta','vouchers','workout_sessions',
    'workspace_modules'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trigger_auto_set_workspace_id ON public.%I', tbl);
      EXECUTE format(
        'CREATE TRIGGER trigger_auto_set_workspace_id
          BEFORE INSERT ON public.%I
          FOR EACH ROW
          EXECUTE FUNCTION public.auto_set_workspace_id()',
        tbl
      );
    END IF;
  END LOOP;
END $$;
