-- ════════════════════════════════════════════════════════════════════
-- 補 created_by FK → employees(id) ON DELETE SET NULL（27 張缺漏的表）
-- ════════════════════════════════════════════════════════════════════
-- 為什麼（紅線 B）：
--   審計欄位 created_by 記「誰建這筆」、語意上必須是員工（E001…）。
--   FK 是「防呆」：擋掉寫入不存在的員工 id、員工刪除時自動把 created_by 設 NULL（不留死指標）。
--   盤點發現：58 張有 created_by 的表、只有 31 張設了 FK、27 張漏設（含 receipts /
--   payment_requests / journal_vouchers 等核心財務表）。這是早期建表沒對齊紅線 B 的系統性遺漏、
--   非單一表問題。本 migration 一次補齊。
--
-- 安全性（apply 前已查 production 實際資料）：
--   • 26 張 uuid 型表：created_by 全部 NULL 或對得到 employees（乾淨）
--   • 唯一例外是 3 筆孤兒（todos 2 筆、quotes 1 筆）指向已刪除的人 → 先設 NULL（記錄已無意義）
--   • quotes.created_by 是 text 型（其餘 26 張是 uuid）→ 先轉 uuid 再加 FK（73 筆值皆正規 uuid 格式、轉得過）
--
-- 不在本 migration（刻意）：
--   • code 層寫入早已用 `created_by: currentUser?.id || undefined`（紅線 B 既有規範）、不需改 code
--   • 此 FK 為純 DB 防呆層、不改變任何現有行為
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. 清 3 筆孤兒（指向已不存在的員工、記錄無意義）→ 設 NULL ──
UPDATE public.todos
  SET created_by = NULL
  WHERE created_by IS NOT NULL
    AND created_by NOT IN (SELECT id FROM public.employees);

UPDATE public.quotes
  SET created_by = NULL
  WHERE created_by IS NOT NULL
    AND created_by NOT IN (SELECT id::text FROM public.employees);

-- ── 2. quotes.created_by：text → uuid（其餘 26 張本來就是 uuid）──
ALTER TABLE public.quotes
  ALTER COLUMN created_by TYPE uuid USING NULLIF(created_by, '')::uuid;

-- ── 3. 27 張表補 FK（idempotent：已存在就跳過）──
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'attractions', 'background_tasks', 'bonus_pending', 'brands',
    'calendar_events', 'companies', 'company_contacts', 'contracts',
    'disbursement_orders', 'driver_tasks', 'hotels', 'itineraries',
    'journal_vouchers', 'notes', 'payment_request_items', 'payment_requests',
    'quotes', 'receipts', 'restaurants', 'salary_settlements', 'suppliers',
    'todos', 'tour_bonus_settings', 'tour_departure_data', 'tour_documents',
    'tour_itinerary_items', 'workspace_integrations'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl AND con.contype = 'f'
        AND pg_get_constraintdef(con.oid) ILIKE '%(created_by)%REFERENCES%employees%'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL',
        tbl, tbl || '_created_by_fkey'
      );
    END IF;
  END LOOP;
END $$;

-- ── 4. 驗證：27 張應全部有 created_by FK ──
DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY[
    'attractions','background_tasks','bonus_pending','brands','calendar_events',
    'companies','company_contacts','contracts','disbursement_orders','driver_tasks',
    'hotels','itineraries','journal_vouchers','notes','payment_request_items',
    'payment_requests','quotes','receipts','restaurants','salary_settlements',
    'suppliers','todos','tour_bonus_settings','tour_departure_data','tour_documents',
    'tour_itinerary_items','workspace_integrations'
  ]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) ILIKE '%(created_by)%REFERENCES%employees%'
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '以下表仍缺 created_by FK: %', v_missing;
  END IF;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）：
-- ⚠️ 3 筆孤兒的 created_by 已設 NULL、不可逆（但本來就指向已刪員工、無意義）
--
-- BEGIN;
-- DO $$
-- DECLARE tbl text;
--   tables text[] := ARRAY['attractions','background_tasks','bonus_pending','brands',
--     'calendar_events','companies','company_contacts','contracts','disbursement_orders',
--     'driver_tasks','hotels','itineraries','journal_vouchers','notes','payment_request_items',
--     'payment_requests','quotes','receipts','restaurants','salary_settlements','suppliers',
--     'todos','tour_bonus_settings','tour_departure_data','tour_documents','tour_itinerary_items',
--     'workspace_integrations'];
-- BEGIN
--   FOREACH tbl IN ARRAY tables LOOP
--     EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', tbl, tbl||'_created_by_fkey');
--   END LOOP;
-- END $$;
-- ALTER TABLE public.quotes ALTER COLUMN created_by TYPE text USING created_by::text;
-- COMMIT;
-- ════════════════════════════════════════════════════════════════════
