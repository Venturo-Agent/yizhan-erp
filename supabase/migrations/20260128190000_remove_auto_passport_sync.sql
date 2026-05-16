-- 移除自動護照同步觸發器
-- 簡化流程：顧客管理只更新顧客，訂單成員手動處理

BEGIN;

-- 移除觸發器
DROP TRIGGER IF EXISTS trigger_sync_customer_passport ON public.customers;

-- 保留函數但不再自動觸發（以備未來需要）
COMMENT ON FUNCTION sync_customer_passport_to_members() IS
  '護照同步函數（已停用自動觸發，保留供手動呼叫）';

COMMIT;
