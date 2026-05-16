-- 刪除 hosanna workspace 及其相關資料
DO $$
DECLARE
  ws_id uuid;
BEGIN
  SELECT id INTO ws_id FROM public.workspaces WHERE code = 'hosanna';
  IF ws_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.employees WHERE workspace_id = ws_id;
  BEGIN DELETE FROM public.bank_accounts WHERE workspace_id = ws_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.payment_methods WHERE workspace_id = ws_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.workspaces WHERE id = ws_id;
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE '⚠️ hosanna workspace 有其他依賴，跳過刪除';
  END;
END $$;
