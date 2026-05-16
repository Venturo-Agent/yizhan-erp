---
created: 2026-05-08
expires_after: 2026-06-08
review_owner: william
status: active
upgrade_target: N/A
---

# Migrations Pending

**這個目錄的 SQL 還沒 apply。等搬完伺服器（2026-05-10）才執行。**

跟 `migrations/_pending_review/` 不同：
- `_pending_review/` 是 **destructive**（DROP / DELETE）、需 William 確認
- `migrations-pending/` 是 **純加法**（ADD COLUMN / CREATE TABLE）、配合搬遷 + ADR 拍板才 apply

---

## 待 apply 順序

| 順序 | 檔案 | 對應 ADR | 對應 backlog |
|---|---|---|---|
| 1 | `001_soft_delete_columns.sql` | [ADR-0002](../../docs/adr/0002-soft-delete-policy.md) | [#23](../../docs/refactor-backlog/23-data-lifecycle.md) |
| 2 | `002_audit_logs_table.sql` | [ADR-0003](../../docs/adr/0003-audit-log.md) | [#16](../../docs/refactor-backlog/16-audit-log.md) |
| 3 | `003_set_audit_context_function.sql` | [ADR-0003](../../docs/adr/0003-audit-log.md) | [#16](../../docs/refactor-backlog/16-audit-log.md) |

---

## 搬完伺服器後執行

詳見 [`docs/post-migration-checklist.md`](../../docs/post-migration-checklist.md)。

每個 SQL 前面都有「執行條件」「ADR 拍板項」「rollback 方式」、看完再跑。

---

## Apply 順序與相依

```
001 soft_delete_columns
  ↓ (deleted_at column 必先存在)
002 audit_logs_table
  ↓ (trigger function 必先存在)
003 set_audit_context_function
```

**相依關係**：
- **001 必先於 002**：002 的 `fn_record_audit` trigger 用 `OLD.deleted_at` / `NEW.deleted_at` 偵測軟刪除 vs 一般 update。沒 001 加欄位、trigger 跑會炸 `column "deleted_at" does not exist`。
- **002 必先於 003**：003 用 `CREATE OR REPLACE FUNCTION public.fn_record_audit()` 升級 trigger function（加抓 reason / request_id）、function 必先存在。
- **003 是升級、不是新建**：003 換掉 002 已建的 trigger function、不影響已掛的 trigger。

---

## 001_soft_delete_columns.sql

對 14 張業務 table 加 `deleted_at` / `deleted_by` / `deleted_reason` 欄位 + partial index。

### Apply

Supabase Dashboard → SQL Editor → 貼上整份 → Run。或 `npm run db:migrate`（若 CLI 已配）。

### 驗證

```sql
-- 1. 確認 14 張 table 都有 deleted_at（若某張不存在於 project、會少於 14）
SELECT table_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'deleted_at'
ORDER BY table_name;

-- 2. 確認 partial index 都建好
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%_active'
ORDER BY indexname;

-- 3. 既有資料 deleted_at 都 NULL（活的）
SELECT COUNT(*) FROM public.orders WHERE deleted_at IS NOT NULL; -- 預期 0
```

### Rollback

```sql
-- 逆向：drop 三個欄位 + partial index 從每張 table
DO $$
DECLARE
  target_table TEXT;
  tables TEXT[] := ARRAY[
    'orders','tours','customers','payments','payment_requests',
    'disbursement_orders','receipts','quotes','attractions','restaurants',
    'hotels','suppliers','tour_templates','employees'
  ];
BEGIN
  FOREACH target_table IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = target_table
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS public.%I', format('idx_%s_active', target_table));
      EXECUTE format(
        'ALTER TABLE public.%I
           DROP COLUMN IF EXISTS deleted_at,
           DROP COLUMN IF EXISTS deleted_by,
           DROP COLUMN IF EXISTS deleted_reason',
        target_table
      );
    END IF;
  END LOOP;
END $$;
```

⚠️ 紅線：rollback 前確認沒有 row 已被軟刪除（`deleted_at IS NOT NULL`）、否則資料會永久消失。

### 預期警告

- `NOTICE: ✓ orders 加了 soft delete 欄位 + index` = 正常、每張 table 一條
- `NOTICE: ✗ <table> 不存在、跳過` = 該 table 不在這 project、安全跳過
- `NOTICE: relation "idx_xxx_active" already exists, skipping` = 重跑、`IF NOT EXISTS` 守住、安全
- `NOTICE: column "deleted_at" of relation "xxx" already exists, skipping` = 重跑、安全

---

## 002_audit_logs_table.sql

建 `audit_logs` table + RLS + `fn_record_audit` trigger function、自動掛 trigger 到 10 張核心 table。

### Apply

同上、SQL Editor 貼整份。

### 驗證

```sql
-- 1. 確認 table 建好
SELECT * FROM public.audit_logs LIMIT 0;

-- 2. 確認 trigger 都掛了（預期 10 張、若某張不存在會少）
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_schema = 'public' AND trigger_name LIKE 'audit_%'
ORDER BY event_object_table;

-- 3. RLS 開了、但沒 FORCE
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'audit_logs';
-- 預期：relrowsecurity=t、relforcerowsecurity=f（紅線 #1）

-- 4. 索引建好
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'audit_logs';
-- 預期：idx_audit_workspace_time / idx_audit_entity / idx_audit_actor
```

### Rollback

```sql
-- 順序：先 drop trigger、再 drop function、最後 drop table
DO $$
DECLARE
  target_table TEXT;
  audit_tables TEXT[] := ARRAY[
    'orders','payments','payment_requests','disbursement_orders','receipts',
    'customers','tours','employees','role_capabilities','company_settings'
  ];
BEGIN
  FOREACH target_table IN ARRAY audit_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', target_table, target_table);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.fn_record_audit();

-- ⚠️ 紅線：以下這條會把已記錄的 audit_logs 全刪掉、緊急狀況才用
-- DROP TABLE IF EXISTS public.audit_logs;
```

⚠️ 紅線：rollback **不要** `DROP TABLE audit_logs`、保留歷史 row（合規 / 對帳追溯）。只 drop trigger / function 即可。

### 預期警告

- `NOTICE: ✓ orders trigger 已掛` = 正常、每張 table 一條
- `NOTICE: ✗ <table> 不存在、跳過` = 該 table 不在這 project、安全
- `NOTICE: relation "audit_logs" already exists, skipping` = 重跑、`IF NOT EXISTS` 守住
- `NOTICE: trigger "audit_xxx" for relation ... does not exist, skipping` = 第一次跑時 DROP TRIGGER IF EXISTS 的正常訊息
- 若看到 `ERROR: column "workspace_id" does not exist` = 某張掛 trigger 的 table 沒 workspace_id 欄位、需 ADR-0003 釐清

---

## 003_set_audit_context_function.sql

建 `set_audit_context` RPC function + 升級 `fn_record_audit` 加抓 reason / request_id。

### Apply

同上、SQL Editor 貼整份。

### 驗證

```sql
-- 1. RPC function 建好
SELECT proname FROM pg_proc WHERE proname = 'set_audit_context';

-- 2. 升級後 fn_record_audit 含 reason / request_id 欄位寫入
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'fn_record_audit';
-- 預期：function body 包含 v_reason / v_request_id 變數

-- 3. 端到端測試（用真 employee uuid 換掉）
SELECT public.set_audit_context(
  '<some-employee-uuid>'::uuid,
  'test reason',
  'a0000000-0000-0000-0000-000000000001'
);
UPDATE public.orders SET total = total WHERE id = '<some-order-uuid>';
SELECT actor_id, reason, request_id, action FROM public.audit_logs
ORDER BY created_at DESC LIMIT 1;
-- 預期：actor_id 對、reason='test reason'、request_id 不空、action='update'
```

### Rollback

```sql
-- 1. 把 fn_record_audit 退回 002 版本（不抓 reason / request_id）
--    最快做法：重跑 002 中的 CREATE OR REPLACE FUNCTION public.fn_record_audit() 那段。
--    或從 git history 拉 002 版 function body 重貼。

-- 2. drop set_audit_context RPC
DROP FUNCTION IF EXISTS public.set_audit_context(UUID, TEXT, TEXT);
```

⚠️ 紅線：rollback 003 前必確認應用層 `src/lib/audit/set-audit-context.ts` 沒在用、否則 RPC call 會失敗。

### 預期警告

- 無 NOTICE / WARNING、純 CREATE OR REPLACE
- 若看到 `ERROR: function "fn_record_audit" does not exist` = 002 沒 apply、回去先跑 002

---

## 整套 Rollback（緊急用）

順序：003 → 002 → 001 逆向。

```sql
-- ============ 003 逆向 ============
DROP FUNCTION IF EXISTS public.set_audit_context(UUID, TEXT, TEXT);
-- fn_record_audit 一起 drop（002 也會 drop、合併）

-- ============ 002 逆向 ============
DO $$
DECLARE
  target_table TEXT;
  audit_tables TEXT[] := ARRAY[
    'orders','payments','payment_requests','disbursement_orders','receipts',
    'customers','tours','employees','role_capabilities','company_settings'
  ];
BEGIN
  FOREACH target_table IN ARRAY audit_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', target_table, target_table);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.fn_record_audit();

-- ⚠️ 不 drop audit_logs table、保留歷史
-- DROP TABLE IF EXISTS public.audit_logs;  -- 緊急才解註

-- ============ 001 逆向 ============
DO $$
DECLARE
  target_table TEXT;
  tables TEXT[] := ARRAY[
    'orders','tours','customers','payments','payment_requests',
    'disbursement_orders','receipts','quotes','attractions','restaurants',
    'hotels','suppliers','tour_templates','employees'
  ];
BEGIN
  FOREACH target_table IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = target_table
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS public.%I', format('idx_%s_active', target_table));
      EXECUTE format(
        'ALTER TABLE public.%I
           DROP COLUMN IF EXISTS deleted_at,
           DROP COLUMN IF EXISTS deleted_by,
           DROP COLUMN IF EXISTS deleted_reason',
        target_table
      );
    END IF;
  END LOOP;
END $$;
```

⚠️ 紅線總綱：
- rollback **不刪** `audit_logs` 已有的 row、只 drop trigger / function
- rollback 001 前確認沒 row 已軟刪除、否則資料永久消失
- 緊急狀況跑前先 William 拍板、否則照「升級派」做（fix forward、不 rollback）
