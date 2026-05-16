-- Migration: 補齊 members 和 quote_items 表格的追蹤欄位

-- 1. members 表格：添加 workspace_id 和 created_by
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id);

UPDATE public.members m
SET workspace_id = o.workspace_id
FROM public.orders o
WHERE m.order_id = o.id
AND m.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_members_workspace_id ON public.members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON public.members(created_by);

COMMENT ON COLUMN public.members.workspace_id IS '所屬公司/工作區';
COMMENT ON COLUMN public.members.created_by IS '建立者員工 ID';

-- 2. quote_items 表格（僅在表存在時處理）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='quote_items' AND table_schema='public') THEN
    ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

    UPDATE public.quote_items qi
    SET workspace_id = q.workspace_id
    FROM public.quotes q
    WHERE qi.quote_id = q.id AND qi.workspace_id IS NULL;

    CREATE INDEX IF NOT EXISTS idx_quote_items_workspace_id ON public.quote_items(workspace_id);

    COMMENT ON COLUMN public.quote_items.workspace_id IS '所屬公司/工作區';
  END IF;
END $$;

-- 3. members RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'members' AND rowsecurity = true) THEN
    ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "members_workspace_isolation" ON public.members;
CREATE POLICY "members_workspace_isolation" ON public.members
FOR ALL USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
  OR workspace_id IS NULL
);

-- quote_items RLS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='quote_items' AND table_schema='public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quote_items' AND rowsecurity = true) THEN
      ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
    END IF;

    DROP POLICY IF EXISTS "quote_items_workspace_isolation" ON public.quote_items;
    CREATE POLICY "quote_items_workspace_isolation" ON public.quote_items
    FOR ALL USING (
      workspace_id = get_current_user_workspace()
      OR is_super_admin()
      OR workspace_id IS NULL
    );
  END IF;
END $$;
