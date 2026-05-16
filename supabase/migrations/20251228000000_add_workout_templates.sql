-- 訓練模板資料表
-- 用於儲存使用者常用的訓練組合

BEGIN;

CREATE TABLE IF NOT EXISTS public.timebox_workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON public.timebox_workout_templates(user_id);

-- 啟用 RLS
ALTER TABLE public.timebox_workout_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "workout_templates_select" ON public.timebox_workout_templates;
CREATE POLICY "workout_templates_select" ON public.timebox_workout_templates
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "workout_templates_insert" ON public.timebox_workout_templates;
CREATE POLICY "workout_templates_insert" ON public.timebox_workout_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "workout_templates_update" ON public.timebox_workout_templates;
CREATE POLICY "workout_templates_update" ON public.timebox_workout_templates
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "workout_templates_delete" ON public.timebox_workout_templates;
CREATE POLICY "workout_templates_delete" ON public.timebox_workout_templates
  FOR DELETE USING (user_id = auth.uid());

-- 註解
COMMENT ON TABLE public.timebox_workout_templates IS '訓練模板 - 儲存使用者常用的訓練組合';
COMMENT ON COLUMN public.timebox_workout_templates.name IS '模板名稱，例如：胸推日、腿部訓練';
COMMENT ON COLUMN public.timebox_workout_templates.exercises IS 'WorkoutExercise[] 格式的 JSON 陣列';

COMMIT;
