-- ============================================================================
-- 把 createEntityHook 涵蓋的所有 entity table 加進 supabase_realtime publication
-- Date: 2026-05-18
-- Phase 1.1 of SWR/Cache/Realtime 架構重構（William 2026-05-17 拍板）
--
-- 為什麼：
--   createEntityHook 內 useRealtimeSync 自動訂閱 postgres_changes、UI 預期
--   寫入後立即看到變化。但 production 上 publication 只開 channels /
--   channel_messages / inbox_* 等少數表、其他 33 個 entity 表「程式碼訂閱
--   了、SQL 沒開、broadcast 從 Postgres 根本沒送出」、cache 卡舊資料是
--   必然。本 migration 一次補齊。
--
-- 影響範圍：
--   - 純 ALTER PUBLICATION ADD TABLE、不改 schema、不動 RLS、不動寫入
--   - idempotent：DO block 內檢查、已存在跳過
--   - Supabase Realtime 計費按 connection / 事件數、加 publication 不立刻
--     增加成本、實際 cost 看 caller 端 subscribe 的數量
--
-- 紅線遵守：
--   - 不 FORCE workspaces RLS（紅線 A）— 純 publication 操作、不碰 RLS
--   - 不寫破壞性語法（DROP TABLE / DROP COLUMN）
--   - 跟 CLAUDE.md 紅線 E（SSOT）同向：cache invalidation SSOT
--
-- REPLICA IDENTITY 注意：
--   - 預設 DEFAULT（用 PK）、UPDATE / DELETE 事件 payload.old 只含 PK
--   - 軟刪表若 UI 要根據 deleted_at 過濾、需要 FULL（事件含整列）、之後
--     若 UI 需要再單獨 migration 設、本 migration 不動 REPLICA IDENTITY
--     避免一次改太多影響不到的事
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    -- 基礎 + 帳號
    'ai_agents',
    'employees',
    'workspaces',
    -- 通訊 / 內部頻道（channel_members 沒開過、補上；channels / channel_messages 已開）
    'channel_members',
    -- CRM
    'customers',
    -- cis_clients / cis_pricing_items / cis_visits：entity hook 寫了但 DB 不存在
    -- （schema 漂移、createEntityHook 命名 vs 實際 table 對不齊、需另開 audit 處理）
    -- 之後 DB 有這些表時、補進這個 array 即可。
    -- 旅遊主資料
    'tours',
    'tour_bonus_settings',
    'tour_itinerary_items',
    'itineraries',
    'orders',
    'order_members',
    'quotes',
    -- 庫存 / 共用資料
    'attractions',
    'hotels',
    'restaurants',
    'suppliers',
    'cities',
    'regions',
    'airport_images',
    'image_library',
    -- 財務
    'disbursement_orders',
    'payment_requests',
    'receipts',
    'travel_invoices',
    -- 行事曆
    'calendar_events',
    -- 工作流 / 雜項
    'notes',
    'workspace_documents',
    'workspace_seals',
    -- worldmove eSIM
    'worldmove_esim_items',
    'worldmove_orders'
  ];
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      RAISE NOTICE '  + added: public.%', v_table;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ════ Rollback（萬一某表 realtime 造成 production 流量爆 / 客戶 conn 數過載）════
-- BEGIN;
-- DO $$
-- DECLARE v_tables TEXT[] := ARRAY['ai_agents','employees',/* ... */];
--         v_table TEXT;
-- BEGIN
--   FOREACH v_table IN ARRAY v_tables LOOP
--     IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=v_table) THEN
--       EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', v_table);
--     END IF;
--   END LOOP;
-- END $$;
-- COMMIT;
