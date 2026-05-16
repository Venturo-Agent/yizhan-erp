-- =============================================
-- 下架 Logan AI（內部 AI 助理）
-- 2026-04-23
--
-- 背景：
-- Logan AI 採用本地 Ollama LLM、線上 Vercel 環境無法執行、實際從未對員工提供 AI 回覆。
-- 2026-01-21/22 種了 30 筆 ai_memories 之後 3 個月零更新、決定整個下架。
-- 程式端同步移除：vercel.json cron / src/app/api/logan / src/app/api/cron/sync-logan-knowledge
-- / src/lib/logan / well-known-ids.ts 的 LOGAN_AI_ID。
--
-- 不影響：
-- - VENTURO 機器人（BOT001、000000-...-000000000001）保留、它是系統通知 / 工單狀態派送機器人
-- =============================================

-- 1. 刪除 Logan 寫入的 30 筆 ai_memories
DELETE FROM public.ai_memories
WHERE created_by = '00000000-0000-0000-0000-000000000002';

-- 2. 刪除 Logan 員工 row
DELETE FROM public.employees
WHERE employee_number = 'LOGAN'
  AND id = '00000000-0000-0000-0000-000000000002';

-- 3. 整張 ai_memories 表已無人使用（type 之外無 query / insert）、drop 掉
DROP TABLE IF EXISTS public.ai_memories;
