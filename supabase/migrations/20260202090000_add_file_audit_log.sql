-- ============================================================================
-- 檔案操作歷史紀錄 (File Audit Log)
-- 版本：1.0
-- 日期：2026-02-02
-- 功能：記錄檔案的所有操作歷史，類似 Google Sheets 的版本紀錄
-- ============================================================================

-- ============================================================================
-- 1. 操作類型列舉
-- ============================================================================

CREATE TYPE file_action AS ENUM (
  'create',     -- 上傳/建立
  'update',     -- 更新屬性（分類、標籤、備註等）
  'rename',     -- 重新命名
  'move',       -- 移動到其他資料夾
  'star',       -- 加入/移除星號
  'archive',    -- 封存/解除封存
  'delete',     -- 刪除（軟刪除）
  'restore',    -- 還原
  'download',   -- 下載
  'version'     -- 上傳新版本
);

-- ============================================================================
-- 2. 檔案操作歷史表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.file_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 操作資訊
  action file_action NOT NULL,
  action_label TEXT,                    -- 操作的中文描述（方便顯示）

  -- 誰操作
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,               -- 冗餘存儲，避免 join

  -- 變更內容
  old_values JSONB,                     -- 變更前的值
  new_values JSONB,                     -- 變更後的值

  -- 額外資訊
  metadata JSONB,                       -- 其他資訊（如 IP、User Agent）

  -- 時間
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_file_audit_logs_file ON public.file_audit_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_logs_workspace ON public.file_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_logs_performed_by ON public.file_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_file_audit_logs_created ON public.file_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_audit_logs_action ON public.file_audit_logs(file_id, action);

-- ============================================================================
-- 3. 自動記錄檔案變更的 Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_file_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action file_action;
  v_action_label TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
  v_user_name TEXT;
BEGIN
  -- 取得操作者名稱
  SELECT chinese_name INTO v_user_name
  FROM public.employees
  WHERE supabase_user_id = auth.uid()
  LIMIT 1;

  -- INSERT：建立檔案
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_action_label := '上傳了檔案';
    v_new_values := jsonb_build_object(
      'filename', NEW.filename,
      'folder_id', NEW.folder_id,
      'category', NEW.category
    );

    INSERT INTO public.file_audit_logs (
      file_id, workspace_id, action, action_label,
      performed_by, performed_by_name, new_values
    ) VALUES (
      NEW.id, NEW.workspace_id, v_action, v_action_label,
      auth.uid(), v_user_name, v_new_values
    );

    RETURN NEW;
  END IF;

  -- UPDATE：更新檔案
  IF TG_OP = 'UPDATE' THEN
    -- 判斷是什麼類型的更新

    -- 重新命名
    IF OLD.filename IS DISTINCT FROM NEW.filename THEN
      v_action := 'rename';
      v_action_label := '重新命名檔案';
      v_old_values := jsonb_build_object('filename', OLD.filename);
      v_new_values := jsonb_build_object('filename', NEW.filename);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    -- 移動資料夾
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      v_action := 'move';
      v_action_label := '移動檔案到其他資料夾';
      v_old_values := jsonb_build_object('folder_id', OLD.folder_id);
      v_new_values := jsonb_build_object('folder_id', NEW.folder_id);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    -- 星號變更
    IF OLD.is_starred IS DISTINCT FROM NEW.is_starred THEN
      v_action := 'star';
      v_action_label := CASE WHEN NEW.is_starred THEN '加入星號' ELSE '移除星號' END;
      v_old_values := jsonb_build_object('is_starred', OLD.is_starred);
      v_new_values := jsonb_build_object('is_starred', NEW.is_starred);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    -- 封存變更
    IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
      v_action := 'archive';
      v_action_label := CASE WHEN NEW.is_archived THEN '封存檔案' ELSE '解除封存' END;
      v_old_values := jsonb_build_object('is_archived', OLD.is_archived);
      v_new_values := jsonb_build_object('is_archived', NEW.is_archived);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    -- 刪除/還原
    IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted THEN
      v_action := CASE WHEN NEW.is_deleted THEN 'delete' ELSE 'restore' END;
      v_action_label := CASE WHEN NEW.is_deleted THEN '刪除檔案' ELSE '還原檔案' END;
      v_old_values := jsonb_build_object('is_deleted', OLD.is_deleted);
      v_new_values := jsonb_build_object('is_deleted', NEW.is_deleted);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    -- 分類變更
    IF OLD.category IS DISTINCT FROM NEW.category THEN
      v_action := 'update';
      v_action_label := '變更檔案分類';
      v_old_values := jsonb_build_object('category', OLD.category);
      v_new_values := jsonb_build_object('category', NEW.category);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    -- 備註變更
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      v_action := 'update';
      v_action_label := '更新備註';
      v_old_values := jsonb_build_object('notes', OLD.notes);
      v_new_values := jsonb_build_object('notes', NEW.notes);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    -- 版本更新
    IF OLD.version IS DISTINCT FROM NEW.version THEN
      v_action := 'version';
      v_action_label := '上傳新版本';
      v_old_values := jsonb_build_object('version', OLD.version);
      v_new_values := jsonb_build_object('version', NEW.version);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 Trigger
DROP TRIGGER IF EXISTS tr_log_file_changes ON public.files;
CREATE TRIGGER tr_log_file_changes
  AFTER INSERT OR UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.log_file_changes();

-- ============================================================================
-- 4. 記錄下載的函式（需要前端呼叫）
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_file_download(p_file_id UUID)
RETURNS VOID AS $$
DECLARE
  v_file RECORD;
  v_user_name TEXT;
BEGIN
  -- 取得檔案資訊
  SELECT * INTO v_file FROM public.files WHERE id = p_file_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 取得操作者名稱
  SELECT chinese_name INTO v_user_name
  FROM public.employees
  WHERE supabase_user_id = auth.uid()
  LIMIT 1;

  -- 記錄下載
  INSERT INTO public.file_audit_logs (
    file_id, workspace_id, action, action_label,
    performed_by, performed_by_name
  ) VALUES (
    p_file_id, v_file.workspace_id, 'download', '下載檔案',
    auth.uid(), v_user_name
  );

  -- 更新下載次數
  UPDATE public.files
  SET download_count = COALESCE(download_count, 0) + 1,
      last_accessed_at = now()
  WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. RLS 政策
-- ============================================================================

ALTER TABLE public.file_audit_logs ENABLE ROW LEVEL SECURITY;

-- 同 workspace 可查看
CREATE POLICY "file_audit_logs_select" ON public.file_audit_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

-- 只有系統（透過 trigger/function）可以新增
CREATE POLICY "file_audit_logs_insert" ON public.file_audit_logs
  FOR INSERT WITH CHECK (true);  -- trigger 使用 SECURITY DEFINER

-- 不可更新或刪除（歷史紀錄不可竄改）
-- 不建立 UPDATE/DELETE 政策

-- ============================================================================
-- 6. 查詢檔案歷史的 View
-- ============================================================================

CREATE OR REPLACE VIEW public.file_history AS
SELECT
  fal.id,
  fal.file_id,
  f.filename,
  fal.action,
  fal.action_label,
  fal.performed_by,
  fal.performed_by_name,
  fal.old_values,
  fal.new_values,
  fal.created_at,
  fal.workspace_id
FROM public.file_audit_logs fal
JOIN public.files f ON f.id = fal.file_id
ORDER BY fal.created_at DESC;

-- ============================================================================
-- 7. 註解
-- ============================================================================

COMMENT ON TABLE public.file_audit_logs IS '檔案操作歷史紀錄，類似 Google Sheets 版本紀錄';
COMMENT ON COLUMN public.file_audit_logs.action_label IS '操作的中文描述，方便前端直接顯示';
COMMENT ON COLUMN public.file_audit_logs.performed_by_name IS '冗餘存儲操作者名稱，避免 join';
COMMENT ON COLUMN public.file_audit_logs.old_values IS '變更前的值（JSONB 格式）';
COMMENT ON COLUMN public.file_audit_logs.new_values IS '變更後的值（JSONB 格式）';

COMMENT ON FUNCTION public.log_file_download IS '記錄檔案下載，需要前端呼叫';
