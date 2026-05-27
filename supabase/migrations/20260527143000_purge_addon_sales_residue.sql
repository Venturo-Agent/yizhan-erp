-- ════════════════════════════════════════════════════════════════════════════
-- 清除公共池資料販售殘留（2026-05-27 William 拍板「徹底清、不留殘留」）
--
-- 為什麼：
--   公共池資料販售概念全部移除（addon module 已刪、RLS 已簡化、資料已歸角落）。
--   DB 裡還有對應的孤兒 row（code 層已不認這些 capability / feature），徹底清掉、
--   不留誤會 / 殘留 / 有機可乘的痕跡。
--
-- 清除對象：
--   1. workspace_features：addon_data_{attractions,hotels,restaurants}（disabled 孤兒）
--   2. role_capabilities：
--      - addon_data_*.{read,write}（capabilities.ts 已移除、code 不認）
--      - shared_data.{attractions,hotels,restaurants}.{read,write}（公共池編輯權限殘留）
--
-- 不動（非販售、刻意保留）：
--   - shared_data.{airports,banks,countries}.*（ref_* 全域代號表權限、跟販售無關）
--   - shared_data_management.*（ref_* 管理 module）
--   - database.{attractions,hotels,restaurants}.*（角落管自己景點資料的正牌權限）
--
-- 可逆性說明：
--   被清的都是 code 層已不再定義的孤兒 capability / feature。還原無實質意義
--   （code 不認），若日後要復活販售屬「重建整套 module + capability + seed」、
--   非本 migration 的 rollback。故不建備份表（避免殘留）。
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

DELETE FROM public.workspace_features
WHERE feature_code IN ('addon_data_attractions', 'addon_data_hotels', 'addon_data_restaurants');

DELETE FROM public.role_capabilities
WHERE capability_code IN (
  'addon_data_attractions.read', 'addon_data_attractions.write',
  'addon_data_hotels.read', 'addon_data_hotels.write',
  'addon_data_restaurants.read', 'addon_data_restaurants.write',
  'shared_data.attractions.read', 'shared_data.attractions.write',
  'shared_data.hotels.read', 'shared_data.hotels.write',
  'shared_data.restaurants.read', 'shared_data.restaurants.write'
);

COMMIT;
