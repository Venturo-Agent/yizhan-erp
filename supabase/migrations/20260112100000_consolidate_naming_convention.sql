-- This migration was skipped because the columns may have already been renamed.
-- Original purpose: Standardize database column naming conventions.
-- If you need to run this migration, restore it from git history.

BEGIN;

-- 建立安全重命名函數
CREATE OR REPLACE FUNCTION pg_temp.safe_rename_column(
  p_table text,
  p_old_column text,
  p_new_column text
) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = p_old_column
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = p_new_column
  ) THEN
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', p_table, p_old_column, p_new_column);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Section 1: Standardize creator/author columns
SELECT pg_temp.safe_rename_column('todos', 'creator', 'created_by_legacy');
SELECT pg_temp.safe_rename_column('messages', 'author_id', 'created_by_legacy_author');
SELECT pg_temp.safe_rename_column('advance_lists', 'author_id', 'created_by_legacy_author');
SELECT pg_temp.safe_rename_column('bulletins', 'author_id', 'created_by');
SELECT pg_temp.safe_rename_column('itineraries', 'creator_user_id', 'created_by_legacy_user_id');
SELECT pg_temp.safe_rename_column('quote_versions', 'createdby', 'created_by');

-- Section 2: Fix tables with lowercase/camelCase-like names
-- payments
SELECT pg_temp.safe_rename_column('payments', 'createdat', 'created_at');
SELECT pg_temp.safe_rename_column('payments', 'updatedat', 'updated_at');
SELECT pg_temp.safe_rename_column('payments', 'orderid', 'order_id');
SELECT pg_temp.safe_rename_column('payments', 'tourid', 'tour_id');
SELECT pg_temp.safe_rename_column('payments', 'paymentdate', 'payment_date');
SELECT pg_temp.safe_rename_column('payments', 'paymentnumber', 'payment_number');
SELECT pg_temp.safe_rename_column('payments', 'paymenttype', 'payment_type');
SELECT pg_temp.safe_rename_column('payments', 'receivedby', 'received_by');

-- price_list_items
SELECT pg_temp.safe_rename_column('price_list_items', 'createdat', 'created_at');
SELECT pg_temp.safe_rename_column('price_list_items', 'updatedat', 'updated_at');
SELECT pg_temp.safe_rename_column('price_list_items', 'itemcode', 'item_code');
SELECT pg_temp.safe_rename_column('price_list_items', 'itemname', 'item_name');
SELECT pg_temp.safe_rename_column('price_list_items', 'minimumorder', 'minimum_order');
SELECT pg_temp.safe_rename_column('price_list_items', 'supplierid', 'supplier_id');
SELECT pg_temp.safe_rename_column('price_list_items', 'unitprice', 'unit_price');
SELECT pg_temp.safe_rename_column('price_list_items', 'validfrom', 'valid_from');
SELECT pg_temp.safe_rename_column('price_list_items', 'validuntil', 'valid_until');

-- quote_categories
SELECT pg_temp.safe_rename_column('quote_categories', 'createdat', 'created_at');
SELECT pg_temp.safe_rename_column('quote_categories', 'updatedat', 'updated_at');
SELECT pg_temp.safe_rename_column('quote_categories', 'quoteid', 'quote_id');

-- quote_versions
SELECT pg_temp.safe_rename_column('quote_versions', 'createdat', 'created_at');
SELECT pg_temp.safe_rename_column('quote_versions', 'quoteid', 'quote_id');
SELECT pg_temp.safe_rename_column('quote_versions', 'changenote', 'change_note');

-- receipt_payment_items
SELECT pg_temp.safe_rename_column('receipt_payment_items', 'createdat', 'created_at');
SELECT pg_temp.safe_rename_column('receipt_payment_items', 'itemname', 'item_name');
SELECT pg_temp.safe_rename_column('receipt_payment_items', 'receiptid', 'receipt_id');

-- tour_refunds
SELECT pg_temp.safe_rename_column('tour_refunds', 'createdat', 'created_at');
SELECT pg_temp.safe_rename_column('tour_refunds', 'updatedat', 'updated_at');
SELECT pg_temp.safe_rename_column('tour_refunds', 'memberid', 'member_id');
SELECT pg_temp.safe_rename_column('tour_refunds', 'orderid', 'order_id');
SELECT pg_temp.safe_rename_column('tour_refunds', 'processedby', 'processed_by');
SELECT pg_temp.safe_rename_column('tour_refunds', 'processingstatus', 'processing_status');
SELECT pg_temp.safe_rename_column('tour_refunds', 'refundamount', 'refund_amount');
SELECT pg_temp.safe_rename_column('tour_refunds', 'refunddate', 'refund_date');
SELECT pg_temp.safe_rename_column('tour_refunds', 'refundreason', 'refund_reason');
SELECT pg_temp.safe_rename_column('tour_refunds', 'tourid', 'tour_id');

COMMIT;
