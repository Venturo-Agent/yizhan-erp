-- ════════════════════════════════════════════════════════════════════════════
-- 收掉 shared_data_content gate（2026-05-27 William 拍板）
--
-- 為什麼：
--   shared_data_content 是「公共池資料販售」的 SELECT gate（買了才能讀公共池）。
--   公共池資料已歸還角落（20260527140000）、RLS 已簡化不再引用它（20260527141000）、
--   code 層 0 reference（不在 FEATURES 常數、純 DB seed gate）。
--   清掉 workspace_features 殘留 row（角落 + 漫途整合行銷各一）。
--
-- 保留（非本次範圍、不動）：
--   - shared_data_management module（角落管自己景點/飯店/餐廳資料的後台介面）
--   - shared_data.{attractions,hotels,restaurants}.write capability（RLS 簡化後已無引用、
--     留著無害；清它需動 role_capabilities，風險>收益，留待 DB 重建時清）
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

DELETE FROM public.workspace_features WHERE feature_code = 'shared_data_content';

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- BEGIN;
-- INSERT INTO public.workspace_features (workspace_id, feature_code, enabled) VALUES
--   ('a89335d4-85f1-492b-83c7-2476ab7c5d81', 'shared_data_content', true),
--   ('b2222222-2222-2222-2222-222222222222', 'shared_data_content', true);
-- COMMIT;
