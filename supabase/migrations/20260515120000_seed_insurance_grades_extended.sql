-- ─────────────────────────────────────────────────────────────────────────────
-- 補 seed 健保 / 勞退級距（2026-01-01 生效）
--
-- 2026-05-15 補：
--   - 健保前 11 級跟勞保相同（29,500 ~ 45,800、隨基本工資對齊）
--   - 健保 12-57 級需從健保署官網 PDF 補（漫途 admin 自己進 UI 補）
--   - 勞退前 11 級跟勞保相同
--   - 勞退中段（包含部分工時 1,500 起跳的低級距）需查官方
--
-- Source:
--   - 勞動部勞工保險局：https://www.bli.gov.tw/0100493.html
--   - 健保署投保金額分級表（115.01.01 生效）：https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══ 健保前 11 級補 seed（跟勞保前 11 級對齊）═══
INSERT INTO public.ref_insurance_salary_grades
  (kind, grade_number, monthly_amount, effective_from, source_url, notes) VALUES
  ('health', 2,  30300, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '前 11 級跟勞保對齊'),
  ('health', 3,  31800, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 4,  33300, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 5,  34800, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 6,  36300, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 7,  38200, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 8,  40100, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 9,  42000, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 10, 43900, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', NULL),
  ('health', 11, 45800, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '跟勞保最高同'),
  -- 健保高級距樣本（待 admin 從 PDF 補完整 12-57 級）
  ('health', 12, 48200, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '估算、待 admin 驗證'),
  ('health', 20, 72800, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '估算、待 admin 驗證'),
  ('health', 30, 109500, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '估算、待 admin 驗證'),
  ('health', 40, 158800, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '估算、待 admin 驗證'),
  ('health', 50, 228600, '2026-01-01', 'https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html', '估算、待 admin 驗證')
ON CONFLICT (kind, grade_number, effective_from) DO NOTHING;

-- ═══ 勞退前 11 級補 seed（跟勞保前 11 級對齊、適用全時受僱者）═══
INSERT INTO public.ref_insurance_salary_grades
  (kind, grade_number, monthly_amount, effective_from, source_url, notes) VALUES
  ('pension', 2,  30300, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '前 11 級跟勞保對齊'),
  ('pension', 3,  31800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 4,  33300, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 5,  34800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 6,  36300, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 7,  38200, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 8,  40100, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 9,  42000, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 10, 43900, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', NULL),
  ('pension', 11, 45800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '勞保最高、勞退繼續往上'),
  -- 勞退繼續往上、超過 45,800 後勞退獨有級距、最高 212,000（47 級）
  ('pension', 20, 65800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '估算、待 admin 驗證'),
  ('pension', 30, 96800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '估算、待 admin 驗證'),
  ('pension', 40, 158800, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '估算、待 admin 驗證'),
  ('pension', 47, 212000, '2026-01-01', 'https://www.bli.gov.tw/0100493.html', '勞退提繳上限')
ON CONFLICT (kind, grade_number, effective_from) DO NOTHING;

DO $$
DECLARE
  v_labor INT;
  v_health INT;
  v_pension INT;
BEGIN
  SELECT COUNT(*) INTO v_labor FROM public.ref_insurance_salary_grades
    WHERE kind = 'labor' AND effective_from = '2026-01-01';
  SELECT COUNT(*) INTO v_health FROM public.ref_insurance_salary_grades
    WHERE kind = 'health' AND effective_from = '2026-01-01';
  SELECT COUNT(*) INTO v_pension FROM public.ref_insurance_salary_grades
    WHERE kind = 'pension' AND effective_from = '2026-01-01';

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✓ 補 seed 完成';
  RAISE NOTICE '  勞保  %  / 11 級', v_labor;
  RAISE NOTICE '  健保  %  / 58 級（中段估算、漫途 admin 驗證並補齊）', v_health;
  RAISE NOTICE '  勞退  %  / 65 級（中段估算、漫途 admin 驗證並補齊）', v_pension;
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;

-- ════════ Rollback（純 INSERT、可砍 row、表結構保留）════════
-- BEGIN;
-- DELETE FROM public.ref_insurance_salary_grades
--   WHERE effective_from = '2026-01-01'
--     AND kind IN ('health', 'pension');
-- COMMIT;
