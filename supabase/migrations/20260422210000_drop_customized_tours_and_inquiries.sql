-- 2026-04-22: 徹底砍「客製化管理」+ tour_expenses 孤兒（William 決策、未來重新開發）
-- 含：客製化詢價、願望清單範本、團需求單、團需求進度 view、團需求 messages/vouchers/items、團支出
BEGIN;
DROP TABLE IF EXISTS public.tour_request_messages CASCADE;
DROP TABLE IF EXISTS public.tour_request_member_vouchers CASCADE;
DROP TABLE IF EXISTS public.tour_request_items CASCADE;
DROP VIEW  IF EXISTS public.tour_requests_progress CASCADE;
DROP TABLE IF EXISTS public.tour_requests CASCADE;
DROP TABLE IF EXISTS public.wishlist_template_items CASCADE;
DROP TABLE IF EXISTS public.wishlist_templates CASCADE;
DROP TABLE IF EXISTS public.customer_inquiries CASCADE;
DROP TABLE IF EXISTS public.tour_expenses CASCADE;
COMMIT;
