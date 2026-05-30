-- ════════════════════════════════════════════════════════════════════════════
-- 清理廢棄表：郵輪代理商 4 表 + 公共池歸還角落的備份快照
-- （2026-05-30 William 拍板）
--
-- 為什麼：
--   1. 郵輪「代理商」功能棄做。kb_agencies 群組 4 張表全空、src/ 與 migrations/
--      零引用、互綁 FK 成自閉群組、從未接上 UI。郵輪主資料 kb_sailings 仍存活、
--      僅砍代理商子模組。
--   2. _shared_data_ownership_backup_20260527 是 5/27「公共池資料過戶給角落旅行社」
--      時留下的 rollback 備份快照（3332 筆）。William 2026-05-30 確認過戶已穩定、
--      不反悔、備份可棄。
--
-- 刪除前驗證（2026-05-30）：
--   - 5 表 src/ 全零引用（src/lib/supabase/types.ts 自動生成除外）
--   - kb 4 表 rows=0；備份表 rows=3332
--   - FK 依賴：3 張 kb 子表皆 CASCADE 指向 kb_agencies、無任何外部表依賴這 5 張
--
-- 紅線對照：#4 刪除前已驗證引用與可逆性
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- 郵輪代理商群組：先刪子表、再刪父表（避免 FK 擋）
DROP TABLE IF EXISTS public.workspace_kb_agency_relations;
DROP TABLE IF EXISTS public.kb_sailing_agencies;
DROP TABLE IF EXISTS public.kb_cruise_agency_relations;
DROP TABLE IF EXISTS public.kb_agencies;

-- 公共池歸還角落的備份快照（過戶已穩定、確認不 rollback）
DROP TABLE IF EXISTS public._shared_data_ownership_backup_20260527;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback 註記：
--   * kb_agency 4 表：全空、語意上可逆，但須重新 CREATE schema 才能復原
--     （原 CREATE migration 已佚失 / 被 squash、需手動重建表定義與 FK）。
--   * _shared_data_ownership_backup_20260527：3332 筆過戶快照、DROP 後【不可逆】。
--     過戶後公共池資料與角落自建資料已混於同一 workspace_id、無欄位可再區分。
--     William 2026-05-30 確認不反悔。
-- ────────────────────────────────────────────────────────────────────────────
