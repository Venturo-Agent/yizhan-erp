-- v_attendance_daily 改 SECURITY INVOKER
-- 修補 advisor 的 security_definer_view ERROR
-- 原本（PG 預設 security_definer）= 跑 view 用 view 擁有者權限、bypass clock_records RLS
-- 改為 security_invoker = 用呼叫者權限、走 clock_records RLS（已有 4 條 policy 守門）

ALTER VIEW public.v_attendance_daily SET (security_invoker = on);
