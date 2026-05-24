-- ════════════════════════════════════════════════════════════════════
-- 緊急止血：passport-images 儲存桶改 private（客戶護照外洩）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼（2026-05-24 深度資安盤查、Supabase advisor + 親驗）：
-- passport-images 桶為 public=true → 客戶護照掃描檔「有網址即可無登入下載、跨租戶」。
-- 旅行社最敏感個資（護照）、屬個資法/GDPR 等級曝險。已於 2026-05-24 夜 execute_sql 緊急
-- 翻 private 止血、此檔為 SOP hotfix 補檔（留 trace）。
--
-- 為什麼翻 private 不破畫面：護照顯示走 usePassportImageUrl → getPassportDisplayUrl →
-- createSignedUrl 即時重簽（15 分鐘短效）；上傳/OCR 也走 signed/admin。app 本來就不靠
-- 桶公開、桶公開是純多餘曝險。
--
-- 註：member-documents / tour-documents / workspace-files 也是 public、但它們的顯示走
-- 存在 DB 的 public 網址直讀、翻 private 會破圖 → 需先做「改走 signed URL」遷移、另案處理。
-- ════════════════════════════════════════════════════════════════════

BEGIN;
UPDATE storage.buckets SET public = false WHERE id = 'passport-images';
COMMIT;

-- ════ Rollback（萬一護照圖顯示異常、先還原再查 signed URL 路徑）════
-- BEGIN; UPDATE storage.buckets SET public = true WHERE id = 'passport-images'; COMMIT;
