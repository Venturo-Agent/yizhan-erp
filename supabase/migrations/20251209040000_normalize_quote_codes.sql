-- 將所有報價單編號標準化為新格式（移除 workspace 前綴）
-- 快速報價單: Q001~Q999 → QA001~QZ999
-- 標準報價單: A001~A999 → AA001~AZ999

BEGIN;

-- 1. 先查看當前所有報價單編號
-- SELECT id, code, quote_type FROM quotes ORDER BY created_at;

-- 2. 更新快速報價單編號
-- 舊格式: Q0001, Q000008, TP-Q001 等 → 新格式: Q001~Q009
UPDATE quotes
SET code = CASE
  -- Q0001 → Q001
  WHEN code ~ '^Q0+[1-9]$' THEN 'Q' || LPAD(REGEXP_REPLACE(code, '^Q0*', ''), 3, '0')
  -- Q000008 → Q008
  WHEN code ~ '^Q0+[0-9]+$' THEN 'Q' || LPAD(REGEXP_REPLACE(code, '^Q0*', ''), 3, '0')
  -- TP-Q001 → Q001
  WHEN code ~ '^[A-Z]{2}-Q[0-9]+$' THEN 'Q' || LPAD(SPLIT_PART(code, '-Q', 2), 3, '0')
  ELSE code
END
WHERE quote_type = 'quick' AND code IS NOT NULL;

-- 3. 更新標準報價單編號
-- 舊格式: TP-A001, TC-A002 等 → 新格式: A001~A004
UPDATE quotes
SET code = CASE
  -- TP-A001 → A001
  WHEN code ~ '^[A-Z]{2}-A[0-9]+$' THEN 'A' || LPAD(SPLIT_PART(code, '-A', 2), 3, '0')
  ELSE code
END
WHERE (quote_type IS NULL OR quote_type != 'quick') AND code IS NOT NULL;

COMMIT;
