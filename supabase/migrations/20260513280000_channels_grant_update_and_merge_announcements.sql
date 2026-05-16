-- ════════════════════════════════════════════════════════════════════════
-- Channels: 修 UPDATE 權限 + 合併公告為單一頻道
--
-- 5/13 William feedback：
--   1. 未讀紅點清不掉（進頻道後仍未讀）
--      根因：channel_members 沒 GRANT UPDATE TO authenticated、
--            前端 updateChannelMember(last_read_at=now()) 被 RLS-外的 GRANT 擋
--            （RLS pass 但 GRANT 沒給、PG 仍拒）
--      錯誤：permission denied for table channel_members
--      修法：補 GRANT
--
--   2. 公告層級太多、要單一「公告」頻道（合併重要事項 / 日常公告 / 表揚紀錄）
--      做法：保留每 workspace 的「重要事項」改名「公告」、
--            其他 2 個 archived=true（不刪、保留 row、sidebar 已 exclude）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. 補 GRANT — channel_members / channel_messages 完整 CRUD 給 authenticated
--    （RLS policy 仍守、grant 只是「能不能執行該動作」）
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;

-- 2. 合併公告：「重要事項」改名「公告」、其他 announcement archive
UPDATE public.channels
SET name = '公告'
WHERE is_official = true
  AND type = 'announcement'
  AND name = '重要事項';

UPDATE public.channels
SET is_archived = true, archived_at = now()
WHERE is_official = true
  AND type = 'announcement'
  AND name IN ('日常公告', '表揚 & 紀錄');

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ════ Rollback ════
-- BEGIN;
-- UPDATE public.channels SET is_archived = false, archived_at = NULL
--   WHERE is_official = true AND type = 'announcement' AND name IN ('日常公告', '表揚 & 紀錄');
-- UPDATE public.channels SET name = '重要事項'
--   WHERE is_official = true AND type = 'announcement' AND name = '公告';
-- -- GRANT 不還原（拿掉會壞 production）
-- COMMIT;
