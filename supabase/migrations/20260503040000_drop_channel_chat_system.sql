-- ============================================================================
-- 20260503040000_drop_channel_chat_system.sql
--
-- N-M04: 內部聊天模組整套刪除
-- William 2026-05-02 拍板：「內部聊天功能直接完全刪除、不需要區分解凍或凍結、直接移除即可」
--
-- 砍 4 張 DB 表 + 整個 /channel UI + 所有 stores / utils / tour 整合
-- 對應憲法 §16 凍結模組（channels / messages / channel_groups / channel_members）
-- 凍結改為「已刪除」、之後另案更新規範文件
-- ============================================================================

-- 用 CASCADE 處理 FK 依賴（messages → channels、channel_members → channels 等）
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.channel_members CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.channel_groups CASCADE;
