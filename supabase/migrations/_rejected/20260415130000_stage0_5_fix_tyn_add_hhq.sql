-- Stage 0.5: 拆 TYN 命名衝突炸彈 + 補 HHQ seed 漏洞
-- 計畫文件：docs/REFACTOR_PLAN_REF_DATA.md
--
-- 背景：
--   - TYN 在 ref_airports 被當成桃園使用，但真實 IATA TYN = 中國山西太原機場
--   - HHQ（Hua Hin 華欣機場，泰國）是真 IATA 但 seed 漏掉
--   - 盤點：0 tours 使用 TYN，搬遷零風險
--
-- 動作：
--   1. 三個 workspace 的 TYN(桃園) → 改為 TYU
--   2. 三個 workspace 各補一筆 HHQ(華欣)

BEGIN;

-- 1. TYN → TYU（每個 workspace 各一行）
UPDATE ref_airports
SET iata_code = 'TYU'
WHERE iata_code = 'TYN'
  AND city_name_zh = '桃園';

-- 驗證：應該有 3 列被更新
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM ref_airports WHERE iata_code = 'TYU';
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'Expected 3 TYU rows, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM ref_airports WHERE iata_code = 'TYN';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Expected 0 remaining TYN rows, got %', v_count;
  END IF;
END $$;

-- 2. 補 HHQ（Hua Hin Airport, Thailand）到三個 workspace
INSERT INTO ref_airports (
  iata_code, icao_code, english_name, name_zh,
  city_code, city_name_en, city_name_zh,
  country_code, timezone, latitude, longitude,
  workspace_id
)
SELECT
  'HHQ', 'VTPH', 'Hua Hin Airport', '華欣機場',
  'HHQ', 'Hua Hin', '華欣',
  'TH', 'Asia/Bangkok', 12.6361, 99.9514,
  w.id
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM ref_airports a
  WHERE a.workspace_id = w.id AND a.iata_code = 'HHQ'
);

-- 驗證 HHQ 已覆蓋所有 workspace
DO $$
DECLARE
  v_workspaces int;
  v_hhq int;
BEGIN
  SELECT count(*) INTO v_workspaces FROM workspaces;
  SELECT count(*) INTO v_hhq FROM ref_airports WHERE iata_code = 'HHQ';
  IF v_hhq < v_workspaces THEN
    RAISE EXCEPTION 'HHQ rows (%) less than workspaces (%)', v_hhq, v_workspaces;
  END IF;
END $$;

COMMIT;
