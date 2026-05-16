-- ─────────────────────────────────────────────────────────────────────────────
-- 勞健保 / 勞退 級距表（共用資料、所有 workspace 共用）
--
-- 2026-05-15 William 拍板：放共用資料管理、漫途 + 角落（有 shared_data_management）可編輯、
-- 其他 workspace 唯讀。每年 1/1 勞動部 / 健保署公告調整時、admin 自己進去 update。
--
-- 設計：一張表三種 kind（labor / health / pension）、簡化 UI（一頁三 tab）。
-- 通用 schema：grade_number / monthly_amount / effective_from / effective_until。
--
-- 費率不存表、寫在 service code 內（每年若費率變、改 service 即可）：
--   - 勞保：12.5%、員工 20% / 雇主 70% / 政府 10%
--   - 健保：5.17%、員工 30% / 雇主 60% / 政府 10%
--   - 勞退：雇主強制 6%、員工自願 0-6%
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.ref_insurance_salary_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 保險種類
  kind TEXT NOT NULL CHECK (kind IN ('labor', 'health', 'pension')),
  -- 級數（1 起跳）
  grade_number INTEGER NOT NULL,
  -- 月投保金額（勞保 / 健保）或月提繳工資（勞退）
  monthly_amount NUMERIC(10,2) NOT NULL,
  -- 生效日（譬如 2026-01-01）
  effective_from DATE NOT NULL,
  -- 失效日、NULL = 還在用、之後新版上線時設這欄
  effective_until DATE,
  -- 公告資料來源 URL
  source_url TEXT,
  -- 備註
  notes TEXT,
  -- audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  -- 同 kind 同級數同生效日只能一筆
  UNIQUE (kind, grade_number, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_insurance_grades_kind_effective
  ON public.ref_insurance_salary_grades(kind, effective_from DESC)
  WHERE effective_until IS NULL;

COMMENT ON TABLE public.ref_insurance_salary_grades IS
  '勞健保 / 勞退 級距表（共用資料）— 每年 1/1 admin 自己 update';

-- ═══ RLS：全 authenticated 可讀、寫只給有 shared_data.X.write 的人 ═══

ALTER TABLE public.ref_insurance_salary_grades ENABLE ROW LEVEL SECURITY;

-- 讀：全 authenticated 可讀（基礎資料、所有 workspace 都要用）
DROP POLICY IF EXISTS insurance_grades_select ON public.ref_insurance_salary_grades;
CREATE POLICY insurance_grades_select ON public.ref_insurance_salary_grades
  FOR SELECT TO authenticated USING (true);

-- 寫：要 shared_data_management.write capability（漫途 + 角落）
DROP POLICY IF EXISTS insurance_grades_insert ON public.ref_insurance_salary_grades;
CREATE POLICY insurance_grades_insert ON public.ref_insurance_salary_grades
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = (SELECT auth.uid())
        AND rc.capability_code = 'shared_data_management.write'
        AND rc.enabled = true
    )
  );

DROP POLICY IF EXISTS insurance_grades_update ON public.ref_insurance_salary_grades;
CREATE POLICY insurance_grades_update ON public.ref_insurance_salary_grades
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = (SELECT auth.uid())
        AND rc.capability_code = 'shared_data_management.write'
        AND rc.enabled = true
    )
  );

DROP POLICY IF EXISTS insurance_grades_delete ON public.ref_insurance_salary_grades;
CREATE POLICY insurance_grades_delete ON public.ref_insurance_salary_grades
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = (SELECT auth.uid())
        AND rc.capability_code = 'shared_data_management.write'
        AND rc.enabled = true
    )
  );

-- ═══ Seed 2026 資料 ═══

-- 勞保 11 級（2026-01-01 生效）— 完整、來自勞動部勞工保險局
-- Source: https://www.bli.gov.tw/0100493.html
INSERT INTO public.ref_insurance_salary_grades
  (kind, grade_number, monthly_amount, effective_from, source_url, notes) VALUES
  ('labor', 1,  29500, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '2026.1.1 隨基本工資調升 29,500'),
  ('labor', 2,  30300, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 3,  31800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 4,  33300, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 5,  34800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 6,  36300, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 7,  38200, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 8,  40100, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 9,  42000, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 10, 43900, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('labor', 11, 45800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '勞保最高級距')
ON CONFLICT (kind, grade_number, effective_from) DO NOTHING;

-- 健保 partial seed（第 1 級 + 最高一級、其餘 56 級待漫途 admin 從健保署 PDF 補）
-- Source: https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html
INSERT INTO public.ref_insurance_salary_grades
  (kind, grade_number, monthly_amount, effective_from, source_url, notes) VALUES
  ('health', 1,  29500,  '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '2026 第 1 級、配合基本工資'),
  ('health', 58, 313000, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '健保最高一級（自 2024 起不變）')
ON CONFLICT (kind, grade_number, effective_from) DO NOTHING;

-- 勞退月提繳工資 partial seed（第 1 級 + 最高一級、其餘 63 級待 admin 補）
-- 勞退最高月提繳工資 NT$150,000（65 級）
INSERT INTO public.ref_insurance_salary_grades
  (kind, grade_number, monthly_amount, effective_from, source_url, notes) VALUES
  ('pension', 1,  29500,  '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '勞退月提繳工資第 1 級'),
  ('pension', 65, 150000, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '勞退月提繳工資最高級')
ON CONFLICT (kind, grade_number, effective_from) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✓ 勞健保 / 勞退級距表建立完成';
  RAISE NOTICE '  - ref_insurance_salary_grades (kind: labor / health / pension)';
  RAISE NOTICE '  - 勞保 11 級完整 seed';
  RAISE NOTICE '  - 健保 / 勞退 partial seed（第 1 級 + 最高、其餘待 admin fill）';
  RAISE NOTICE '  - RLS: 全可讀、寫要 shared_data_management.write';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;

-- ════════ Rollback ════════
-- BEGIN;
-- DROP TABLE IF EXISTS public.ref_insurance_salary_grades;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
