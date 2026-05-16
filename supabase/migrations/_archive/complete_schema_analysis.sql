-- 📊 完整的資料庫架構分析
-- 目的：找出所有與 employees 相關的欄位及其類型

-- ============================================
-- Part 1: 列出所有可能引用 employees 的欄位
-- ============================================

SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  CASE
    WHEN data_type = 'uuid' THEN '✅ UUID'
    WHEN data_type = 'text' OR data_type = 'character varying' THEN '⚠️ TEXT'
    ELSE '❓ ' || data_type
  END as type_status,
  CASE
    WHEN column_name LIKE '%employee%' THEN 'employee 相關'
    WHEN column_name LIKE '%author%' THEN 'author 相關'
    WHEN column_name LIKE '%creator%' THEN 'creator 相關'
    WHEN column_name LIKE '%assignee%' THEN 'assignee 相關'
    WHEN column_name LIKE '%created_by%' THEN 'created_by 相關'
    WHEN column_name LIKE '%updated_by%' THEN 'updated_by 相關'
    WHEN column_name LIKE '%processed_by%' THEN 'processed_by 相關'
    WHEN column_name LIKE '%requester%' THEN 'requester 相關'
    WHEN column_name LIKE '%approved_by%' THEN 'approved_by 相關'
    WHEN column_name LIKE '%paid_by%' THEN 'paid_by 相關'
    WHEN column_name LIKE '%user_id%' THEN 'user_id 相關'
    WHEN column_name LIKE '%owner%' THEN 'owner 相關'
    ELSE '其他'
  END as field_category
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%employee%'
    OR column_name LIKE '%author%'
    OR column_name LIKE '%creator%'
    OR column_name LIKE '%assignee%'
    OR column_name LIKE '%created_by%'
    OR column_name LIKE '%updated_by%'
    OR column_name LIKE '%processed_by%'
    OR column_name LIKE '%requester%'
    OR column_name LIKE '%approved_by%'
    OR column_name LIKE '%paid_by%'
    OR column_name LIKE '%user_id%'
    OR column_name LIKE '%owner%'
  )
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE 'sql_%'
ORDER BY
  CASE
    WHEN data_type = 'text' OR data_type = 'character varying' THEN 1
    WHEN data_type = 'uuid' THEN 2
    ELSE 3
  END,
  table_name,
  column_name;

-- ============================================
-- Part 2: 統計各表的 ID 類型分布
-- ============================================

SELECT
  '📊 ID 類型統計' as section,
  COUNT(CASE WHEN data_type = 'uuid' THEN 1 END) as uuid_count,
  COUNT(CASE WHEN data_type IN ('text', 'character varying') THEN 1 END) as text_count,
  COUNT(*) as total_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%employee%'
    OR column_name LIKE '%author%'
    OR column_name LIKE '%creator%'
    OR column_name LIKE '%_by%'
    OR column_name LIKE '%user_id%'
  );

-- ============================================
-- Part 3: 列出所有需要修正的欄位（TEXT 類型）
-- ============================================

SELECT
  '⚠️ 需要修正為 UUID 的欄位：' as section,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type IN ('text', 'character varying')
  AND (
    column_name LIKE '%employee%'
    OR column_name LIKE '%author%'
    OR column_name LIKE '%creator%'
    OR column_name LIKE '%assignee%'
    OR column_name LIKE '%created_by%'
    OR column_name LIKE '%updated_by%'
    OR column_name LIKE '%processed_by%'
    OR column_name LIKE '%requester%'
    OR column_name LIKE '%approved_by%'
    OR column_name LIKE '%paid_by%'
    OR column_name LIKE '%user_id%'
    OR column_name LIKE '%owner%'
  )
ORDER BY table_name, column_name;

-- ============================================
-- Part 4: 檢查外鍵關係
-- ============================================

SELECT
  '🔗 外鍵關係檢查：' as section,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'employees'
ORDER BY tc.table_name, kcu.column_name;
