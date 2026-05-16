-- Fix old bot messages that have 'name' instead of 'display_name' in author JSON
-- This causes them to show as "未知用戶" (unknown user)

BEGIN;

-- Update bot messages to use display_name instead of name in author JSON
UPDATE public.messages
SET author = jsonb_build_object(
  'id', COALESCE(author::jsonb->>'id', '00000000-0000-0000-0000-000000000001'),
  'display_name', COALESCE(author::jsonb->>'name', author::jsonb->>'display_name', '系統機器人'),
  'type', COALESCE(author::jsonb->>'type', 'bot')
)
WHERE created_by = '00000000-0000-0000-0000-000000000001'
  AND author IS NOT NULL
  AND (
    (author::jsonb ? 'name' AND NOT (author::jsonb ? 'display_name'))
    OR author::jsonb->>'display_name' IS NULL
  );

COMMIT;
