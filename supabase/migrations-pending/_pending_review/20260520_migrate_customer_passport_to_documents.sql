-- ════════════════════════════════════════════════════════════════════
-- ⚠️ PENDING REVIEW — 不要直接 apply
-- ════════════════════════════════════════════════════════════════════
--
-- 把 customers.passport_* 五個 inline 欄位搬到 customer_documents、然後
-- DROP COLUMN。「不要補丁、不留雙軌」（William 2026-05-20）。
--
-- 為什麼放 _pending_review/：
--   William 2026-05-20 拍板「之後要轉移、但不是你來轉」。本檔是給之後執行
--   data migration 的人用的草稿、不在主 migrations folder。
--
-- 前置條件（apply 前必確認）：
--   1. customer_documents / document_types 兩張表已建（見
--      20260520070000、20260520071000 兩支 migration）
--   2. seed_visas_module 已跑（document_types.code='passport_tw' 存在）
--   3. 所有讀 customers.passport_* 的 code 已切到讀 customer_documents
--      （否則 DROP COLUMN 之後 client 會炸）
--   4. backup customers 表（萬一 backfill 邏輯有問題、要 rollback）
--
-- 假設（William 2026-05-20 確認）：
--   - 「目前沒有其他國家護照」— 所有 customers.passport_* 一律當「護照 台灣」搬
--   - 未來如有美籍 / 日籍客戶、由使用者在 UI 開新 document 而非 inline 填
--
-- 動作：
--   A. 對所有 passport_number 非空的客戶、寫一筆 customer_documents
--      (document_type='passport_tw'、status='active'、is_primary=true)
--   B. DROP customers.passport_* × 5 欄位
--
-- 風險：
--   - 重複 apply：A 步驟用 ON CONFLICT 守、不會雙寫 primary
--   - rollback：DROP COLUMN 不可逆、必先在測試環境跑過 + 確認 UI / API
--     已不再 reference 那 5 欄
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- A. Backfill：把 customers.passport_* 搬到 customer_documents
-- ════════════════════════════════════════════════════════════════════

INSERT INTO public.customer_documents
  (workspace_id, customer_id, document_type_id,
   document_number, document_name, document_name_print, image_url,
   expires_on, status, is_primary, created_by, updated_by)
SELECT
  c.workspace_id,
  c.id AS customer_id,
  dt.id AS document_type_id,
  c.passport_number,
  c.passport_name,
  c.passport_name_print,
  c.passport_image_url,
  -- passport_expiry 是 text、嘗試轉 date；失敗就 NULL
  CASE
    WHEN c.passport_expiry ~ '^\d{4}-\d{2}-\d{2}$' THEN c.passport_expiry::date
    WHEN c.passport_expiry ~ '^\d{4}/\d{2}/\d{2}$' THEN to_date(c.passport_expiry, 'YYYY/MM/DD')
    ELSE NULL
  END,
  -- 號碼非空就當 active；空但 name 有資料就 processing；都空不該到這裡（WHERE 已過濾）
  'active',
  true,
  NULL,  -- created_by 留 NULL（系統 backfill、非員工操作）
  NULL
FROM public.customers c
JOIN public.document_types dt
  ON dt.workspace_id = c.workspace_id
  AND dt.code = 'passport_tw'
  AND dt.deleted_at IS NULL
WHERE c.passport_number IS NOT NULL
  AND length(trim(c.passport_number)) > 0
  AND c.deleted_at IS NULL
  -- 防重複 apply：該客戶已有「護照 台灣」primary 就跳過
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_documents cd
    WHERE cd.customer_id = c.id
      AND cd.document_type_id = dt.id
      AND cd.is_primary = true
      AND cd.deleted_at IS NULL
  );

-- ════════════════════════════════════════════════════════════════════
-- B. DROP customers.passport_* × 5
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.customers DROP COLUMN IF EXISTS passport_number;
ALTER TABLE public.customers DROP COLUMN IF EXISTS passport_name;
ALTER TABLE public.customers DROP COLUMN IF EXISTS passport_name_print;
ALTER TABLE public.customers DROP COLUMN IF EXISTS passport_expiry;
ALTER TABLE public.customers DROP COLUMN IF EXISTS passport_image_url;

-- ════════════════════════════════════════════════════════════════════
-- 驗證
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_passport_docs int;
  v_columns_remaining int;
BEGIN
  SELECT count(*) INTO v_passport_docs
  FROM public.customer_documents cd
  JOIN public.document_types dt ON dt.id = cd.document_type_id
  WHERE dt.code = 'passport_tw' AND cd.deleted_at IS NULL;

  SELECT count(*) INTO v_columns_remaining
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'customers'
    AND column_name LIKE 'passport_%';

  IF v_columns_remaining > 0 THEN
    RAISE EXCEPTION 'DROP COLUMN 未完成、剩 % 個 passport_* 欄位', v_columns_remaining;
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'customer.passport_* 搬遷完成：';
  RAISE NOTICE '  搬到 customer_documents (護照 台灣): % 筆', v_passport_docs;
  RAISE NOTICE '  customers.passport_* 欄位殘留: % (應為 0)', v_columns_remaining;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ════ Rollback ════
-- ⚠️ DROP COLUMN 已不可逆。Rollback 只能：
--   1. 從 customers 表備份還原（DROP COLUMN 前必先 pg_dump）
--   2. 接著 DELETE 本 migration 寫進 customer_documents 的 row（用 created_by IS NULL 過濾）
--
-- BEGIN;
-- -- 1. 假設你已從備份還原了 customers.passport_* 五欄
-- ALTER TABLE public.customers
--   ADD COLUMN passport_number text,
--   ADD COLUMN passport_name text,
--   ADD COLUMN passport_name_print text,
--   ADD COLUMN passport_expiry text,
--   ADD COLUMN passport_image_url text;
-- -- 2. 從備份還原資料（pg_restore 或手動 UPDATE）
-- -- 3. 清掉 backfill 寫入的 customer_documents
-- DELETE FROM public.customer_documents cd
-- USING public.document_types dt
-- WHERE cd.document_type_id = dt.id
--   AND dt.code = 'passport_tw'
--   AND cd.created_by IS NULL;  -- 純 backfill row 才清、人工新增的不動
-- COMMIT;
