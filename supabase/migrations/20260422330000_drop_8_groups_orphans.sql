-- 2026-04-22: 砍 8 大族群孤兒（William 上線前最後大清理）
-- 全部 row 已 export 到 docs/PRE_LAUNCH_CLEANUP/exports/
-- 保留：employees / agent_registry / ai_bots / ai_messages / supplier_employees / employee_route_overrides / accounting_period_closings / _migrations / rate_limits
BEGIN;

-- 群 1: 線上旅遊端 C 端（30+ 表）
DROP TABLE IF EXISTS public.website_day_activities CASCADE;
DROP TABLE IF EXISTS public.website_destinations CASCADE;
DROP TABLE IF EXISTS public.website_footer_links CASCADE;
DROP TABLE IF EXISTS public.website_hero_content CASCADE;
DROP TABLE IF EXISTS public.website_hero_videos CASCADE;
DROP TABLE IF EXISTS public.website_itineraries CASCADE;
DROP TABLE IF EXISTS public.website_itinerary_days CASCADE;
DROP TABLE IF EXISTS public.website_settings CASCADE;
DROP TABLE IF EXISTS public.website_spot_highlights CASCADE;
DROP TABLE IF EXISTS public.website_story_sections CASCADE;
DROP TABLE IF EXISTS public.traveler_badges CASCADE;
DROP TABLE IF EXISTS public.traveler_conversation_members CASCADE;
DROP TABLE IF EXISTS public.traveler_conversations CASCADE;
DROP TABLE IF EXISTS public.traveler_expense_splits CASCADE;
DROP TABLE IF EXISTS public.traveler_expenses CASCADE;
DROP TABLE IF EXISTS public.traveler_friends CASCADE;
DROP TABLE IF EXISTS public.traveler_messages CASCADE;
DROP TABLE IF EXISTS public.traveler_profiles CASCADE;
DROP TABLE IF EXISTS public.traveler_settlements CASCADE;
DROP TABLE IF EXISTS public.traveler_split_group_members CASCADE;
DROP TABLE IF EXISTS public.traveler_split_groups CASCADE;
DROP TABLE IF EXISTS public.traveler_tour_cache CASCADE;
DROP TABLE IF EXISTS public.traveler_trip_accommodations CASCADE;
DROP TABLE IF EXISTS public.traveler_trip_briefings CASCADE;
DROP TABLE IF EXISTS public.traveler_trip_flights CASCADE;
DROP TABLE IF EXISTS public.traveler_trip_invitations CASCADE;
DROP TABLE IF EXISTS public.traveler_trip_itinerary_items CASCADE;
DROP TABLE IF EXISTS public.traveler_trip_members CASCADE;
DROP TABLE IF EXISTS public.traveler_trips CASCADE;
DROP TABLE IF EXISTS public.trip_members CASCADE;
DROP TABLE IF EXISTS public.trip_members_v2 CASCADE;
DROP TABLE IF EXISTS public.online_trip_members CASCADE;
DROP TABLE IF EXISTS public.online_trips CASCADE;
DROP TABLE IF EXISTS public.assigned_itineraries CASCADE;
DROP TABLE IF EXISTS public.casual_trips CASCADE;
DROP TABLE IF EXISTS public.channel_threads CASCADE;
DROP TABLE IF EXISTS public.private_messages CASCADE;

-- 群 2: 會計複式記帳骨架（9 張、含 events 12 row 真實付款記錄）
DROP TABLE IF EXISTS public.accounting_entries CASCADE;
DROP TABLE IF EXISTS public.accounting_events CASCADE;
DROP TABLE IF EXISTS public.accounting_periods CASCADE;
DROP TABLE IF EXISTS public.general_ledger CASCADE;
DROP TABLE IF EXISTS public.posting_rules CASCADE;
DROP TABLE IF EXISTS public.opening_balances CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.invoice_orders CASCADE;
DROP TABLE IF EXISTS public.disbursement_requests CASCADE;

-- 群 3: 郵件系統
DROP TABLE IF EXISTS public.email_attachments CASCADE;
DROP TABLE IF EXISTS public.emails CASCADE;
DROP TABLE IF EXISTS public.email_accounts CASCADE;

-- 群 4: 時間盒/個人
DROP TABLE IF EXISTS public.timebox_workout_templates CASCADE;
DROP TABLE IF EXISTS public.timebox_boxes CASCADE;
DROP TABLE IF EXISTS public.timebox_weeks CASCADE;

-- 群 5: 客戶擴張（customers 主表保留）
DROP TABLE IF EXISTS public.customer_group_members CASCADE;
DROP TABLE IF EXISTS public.customer_groups CASCADE;
DROP TABLE IF EXISTS public.customer_service_leads CASCADE;
DROP TABLE IF EXISTS public.customer_travel_cards CASCADE;
DROP TABLE IF EXISTS public.customer_badges CASCADE;

-- 群 6: 遊戲化 / Badge / Social
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badge_definitions CASCADE;
DROP TABLE IF EXISTS public.user_points_transactions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.social_group_members CASCADE;
DROP TABLE IF EXISTS public.social_group_tags CASCADE;
DROP TABLE IF EXISTS public.social_groups CASCADE;
DROP TABLE IF EXISTS public.game_office_rooms CASCADE;
DROP TABLE IF EXISTS public.cover_templates CASCADE;

-- 群 7: 舊模板
DROP TABLE IF EXISTS public.hotel_templates CASCADE;
DROP TABLE IF EXISTS public.flight_templates CASCADE;
DROP TABLE IF EXISTS public.leader_templates CASCADE;
DROP TABLE IF EXISTS public.pricing_templates CASCADE;
DROP TABLE IF EXISTS public.features_templates CASCADE;
DROP TABLE IF EXISTS public.travel_card_templates CASCADE;
DROP TABLE IF EXISTS public.tour_folder_templates CASCADE;
DROP TABLE IF EXISTS public.daily_templates CASCADE;

-- 群 8: 備份/孤兒
DROP TABLE IF EXISTS public.ref_airports_backup CASCADE;
DROP TABLE IF EXISTS public.magic_combo_items CASCADE;
DROP TABLE IF EXISTS public.magic_combos CASCADE;
DROP TABLE IF EXISTS public.region_stats CASCADE;
DROP TABLE IF EXISTS public.luxury_hotels CASCADE;
DROP TABLE IF EXISTS public.expense_streaks CASCADE;
DROP TABLE IF EXISTS public.expense_monthly_stats CASCADE;
DROP TABLE IF EXISTS public.meeting_messages CASCADE;
DROP TABLE IF EXISTS public.meeting_participants CASCADE;
DROP TABLE IF EXISTS public.meeting_rooms CASCADE;
DROP TABLE IF EXISTS public.syncqueue CASCADE;
DROP TABLE IF EXISTS public.decisions_log CASCADE;
DROP TABLE IF EXISTS public.eyeline_submissions CASCADE;
DROP TABLE IF EXISTS public.manifestation_records CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.customization_requests CASCADE;
DROP TABLE IF EXISTS public.attraction_licenses CASCADE;
DROP TABLE IF EXISTS public.api_usage_log CASCADE;
DROP TABLE IF EXISTS public.workload_summary CASCADE;

COMMIT;
