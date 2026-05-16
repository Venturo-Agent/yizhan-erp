-- 建立公司公告表
BEGIN;

CREATE TABLE IF NOT EXISTS public.company_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  publish_date TIMESTAMPTZ DEFAULT NOW(),
  expire_date TIMESTAMPTZ,
  visibility TEXT DEFAULT 'all',
  visible_to_roles TEXT[],
  visible_to_employees UUID[],
  status TEXT DEFAULT 'draft',
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,
  _deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_company_announcements_workspace_id ON public.company_announcements(workspace_id);
ALTER TABLE public.company_announcements DISABLE ROW LEVEL SECURITY;

COMMIT;
