# 整晚心得報告 — Max — 2026-05-20

## 我這晚做了什麼
- 完成 3 項 audit 任務、commit 3 次（`b7ef04f` / `d95f854` / `1d3d60d`）
- 產出 3 份報告：
  - `2026-05-20-6-layer-audit.md`（6 層架構全表 audit）
  - `2026-05-20-red-lines-audit.md`（紅線 A-G 全 codebase 掃描）
  - `2026-05-20-5-ssot-audit.md`（5 SSOT 對齊全 module audit）

## 我跳過什麼 / 為什麼
- **DB 層（L3/L4/L5）直接檢核**：Mac IPv6 不通 Supabase、audit:rls 的 DB 層 skip。這是環境限制、CI Linux 環境應能跑完整，不影響靜態掃描結論的可信度。
- **實際上機跑 SQL**：嚴守 charter 紅線、不對 production DB 跑 DDL/DML。紅線 B 的 FK 問題只做靜態 migration 掃描、沒 execute。
- **修任何 bug**：只 audit、找出問題寫進報告、不動一行 code。

## 我覺得自己哪裡判斷對、哪裡可能錯
- ✅ **紅線 A（workspaces NO FORCE）**確認守住：migration 鏈乾淨、最終狀態 NO FORCE
- ✅ **紅線 E（trigger × API 雙寫）**守住：audit:writes 0 撞車
- ✅ **紅線 C（admin client per-request）**守住：未發現 singleton export
- ✅ **紅線 G（per-user cache key）**守住：SWR 健檢 Round 4 驗證
- ⚠️ **紅線 B 的 severity 可能高估**：發現多個早期 migration 的 `created_by` 指 `auth.users`，但這些可能是歷史遺留（那時候還沒定紅線 B）、且可能是符合業務語意的（image_library / file_system 等可能是用戶自己上傳的）。需要 William 確認這些 FK 的業務語意，不能直接斷定是漏洞。
- ⚠️ **紅線 0 的 `isAdmin` 判斷**：斷定「不是特權繞道」是對的，但變數名本身違反用詞紀律（紅線 0.1）。如果 HR role 的 `is_admin` 布林欄位真的存在，那是 DB 結構問題，不是 code 層繞道。
- ⚠️ **travel_invoice module 無 page.tsx**：可能是 William 有意留的白，判斷為「待開發」而非「落後功能」。

## 給 Claude / William 的提醒
1. **紅線 B**：需 William 確認以下 migration 是否在 apply 後已修正：`tour_control_forms` / `image_library` / `email_system` / `file_system`
2. **travel_invoice**：補 page 或從 modules/ 移除、避免 HR UI 出現空洞
3. **CI 環境**：需設定 `SUPABASE_DB_URL` secret，讓 audit:rls 在 CI 跑 L3/L4/L5 全量
4. **Bot module 清理**：`facebook_bot` / `instagram_bot` / `line_bot` 的 capability drift，建議清理減少混淆

## 我建議的下一步
1. **高優**：William 確認紅線 B migration 是否已修正 → 若未，修法 migration 已草稿在 `migrations-pending/audit_B_*.sql.draft`
2. **中優**：`travel_invoice` 若是要做的功能，補 page.tsx；若是廢的，從 modules/ 移除
3. **低優**：清理 3 個已廢 bot module 的 capability drift

## 我這次學到什麼
- 6 層架構的真相：不是「每表都要有 6 層」，是「每請求經過 6 道閘門」，有些表業務性質單純、L3/L4 可以 N/A。Audit 重點是確認「哪些層被跳過」的決策有被記錄。
- 紅線 0 的紀律本質：不是技術問題，是 mindset。「isAdmin」變數名看起來無害，但會 leak 進設計決策。命名紀律跟代碼安全一樣重要。
- 5 SSOT 對齊的本質：modules/ 是單一事實來源，其他 4 個都是衍生。當發現 drift 時，要問的是「modules/ 還是衍生檔錯了」，而不是兩邊調平。