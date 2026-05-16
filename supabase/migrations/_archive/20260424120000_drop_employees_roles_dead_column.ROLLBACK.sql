-- ROLLBACK: 還原 employees.roles column (空陣列預設、無資料還原)
BEGIN;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}';
COMMIT;
