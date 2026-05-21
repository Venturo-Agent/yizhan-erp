-- payment_request_items 加 payee_employee_id
--
-- 業務場景：BNS 獎金 / SAL 薪資 等「公司直接付給員工」的請款明細、需要記錄收款員工
-- 跟 advanced_by 不同：
--   - advanced_by    = 代墊員工（員工先墊錢給供應商、公司還錢給員工）
--   - payee_employee_id = 收款員工（公司直接付給員工、不經供應商）
--
-- 過去 BNS row 員工資訊只在 description 字串裡「OP 獎金 - Carson」、
-- 出納單列表的「付款對象」欄位讀不到員工 id、顯示 "-"。
--
-- 2026-05-21 William 拍板：方案 A、加正式欄位、語意清楚

BEGIN;

ALTER TABLE public.payment_request_items
  ADD COLUMN IF NOT EXISTS payee_employee_id uuid
    REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pri_payee_employee_id
  ON public.payment_request_items(payee_employee_id)
  WHERE payee_employee_id IS NOT NULL;

COMMENT ON COLUMN public.payment_request_items.payee_employee_id IS
  '收款員工 id（公司直接付員工的場景：BNS 獎金 / SAL 薪資等）。
   跟 advanced_by（代墊員工）不同：
     - advanced_by：員工先墊錢給供應商、公司還錢給員工
     - payee_employee_id：公司直接付給員工、不經供應商';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_pri_payee_employee_id;
-- ALTER TABLE public.payment_request_items DROP COLUMN IF EXISTS payee_employee_id;
-- COMMIT;
