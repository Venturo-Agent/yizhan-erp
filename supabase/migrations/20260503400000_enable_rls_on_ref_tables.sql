-- Enable RLS on 5 ref_* tables
-- 修補 advisor 報的 SECURITY ERROR（rls_disabled_in_public + policy_exists_rls_disabled）
-- 這 5 表已有 policies（authenticated 可讀 / super_admin 可改）、僅 RLS 未啟用
-- ENABLE 後 policy 自動生效、anon 不再能讀（前台用 authenticated session、不影響）

ALTER TABLE public.ref_airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_booking_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_ssr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_status_codes ENABLE ROW LEVEL SECURITY;
