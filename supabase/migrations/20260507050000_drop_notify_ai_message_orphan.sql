-- 砍 notify_ai_message 孤兒 function
--
-- 背景：
--   - 這是早期 VENTURO 機器人時代的 trigger function、會打 webhook 到另一個 supabase project
--   - 5/6 砍 VENTURO 機器人時、trigger 已被 drop（pg_trigger 已查無引用）
--   - 但 function 本體沒清、留下孤兒 function
--   - function body 寫死 anon token + 跨 project URL（pfqvdacxowpgfamuvnsn）
--
-- 風險評估：
--   - pg_trigger 已 0 引用 ✅
--   - pg_proc 內其他 function source 0 reference ✅
--   - pg_views 0 reference ✅
--   - 即使有人手動呼叫、跨 project 那邊也應該已經死（VENTURO 機器人時代）
--
-- 影響：純清死 code、無任何 runtime 影響
-- William 確認：2026-05-07 「全部修復好吧」（包含此項）
--
-- Apply 方式：mv 出 _pending_review/、重命名成正式 timestamp、跑 npm run db:migrate

DROP FUNCTION IF EXISTS public.notify_ai_message();
