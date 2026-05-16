-- 2026-04-22: 修 P020 最後 1 條：tour_members 寬鬆 ALL policy
-- 拔掉 authenticated 通吃 policy、保留 4 條 cmd-specific workspace EXISTS（已有）
-- tour_members 10 row 全 Corner 真實資料、零變動
BEGIN;
DROP POLICY IF EXISTS tour_members_authenticated ON public.tour_members;
COMMIT;
