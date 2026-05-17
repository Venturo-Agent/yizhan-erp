-- 補全 hr_bonus_settlement / hr_salary_settlement 給所有缺少的 workspace
-- 980 基本方案應包含：獎金結算 + 薪資結算功能
-- ON CONFLICT DO NOTHING → idempotent、已有的不覆蓋

INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT w.id, 'hr_bonus_settlement', true
FROM public.workspaces w
ON CONFLICT (workspace_id, feature_code) DO NOTHING;

INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT w.id, 'hr_salary_settlement', true
FROM public.workspaces w
ON CONFLICT (workspace_id, feature_code) DO NOTHING;
