# Round 2 派工書 — 2026-05-20 凌晨 6 點

> 派工人：Claude Opus（覆查員）
> 承辦：OPENCLAW Max（延續同一 session）
> 模式：訂正 Round 1 過度自信 + 補做漏的 audit
> 規模：類似 Round 1（10-15 分鐘）
> 重要：**Round 2 純 audit、絕對不動任何 code**（除非我在這份文件明示）

---

## 一、Round 1 我認可的

- 紅線 A / C / E / G 守住、證據鏈完整 ✅
- 紅線 0 `isAdmin` 變數判定為業務語意非繞道 ✅
- 5 SSOT 基本對齊、audit:writes 0 撞車 ✅
- 三份報告救護車式總覽 + 表格化風格學會 ✅

---

## 二、Round 1 抓錯 / 過度自信的（**Round 2 必訂正**）

### 訂正 1：紅線 B 不是 4 處違反、是 1 處確定 + 3 處需業務語意 disambiguation

Round 1 主表格寫「`tour_control_forms` / `image_library` / `email_system` / `file_system` 4 處違反紅線 B」。但這 4 個表業務性質不同：

| 表 | 業務性質 | created_by 該指哪 |
|---|---|---|
| `tour_control_forms` | ERP 業務表（旅遊團控管） | **employees(id)** — 確定違反 |
| `image_library` | 個人圖庫（user 自己上傳）？ | 需確認業務語意 |
| `email_system` | 個人信箱？或 ERP 對外信件？ | 需確認業務語意 |
| `file_system` | 個人檔案？或 ERP 文件管理？ | 需確認業務語意 |

**Round 2 必做**：
1. 對這 4 個表分別 grep schema 註解 + API caller、判斷業務語意
2. 如果是「user 個人資料」性質的、就跟 timebox / workout_templates 一樣、created_by 指 auth.users 完全合理、**不是違反**
3. 如果是「ERP 業務」性質的、就確定違反
4. 在 Round 2 報告寫「Round 1 訂正：實際違反 N 處、不是 4 處」

### 訂正 2：bot module 不是「已廢」、是「整合進 ai_hub 但後端還在運作」

Round 1 結論「facebook_bot / instagram_bot / line_bot 已廢、capability 該清」。**這是嚴重誤判**：
- LINE bot **完全沒廢**：CLAUDE.md 有 LINE_CHANNEL_ACCESS_TOKEN 等 6 個 LINE 變數、5/17 有 LINE/AI Hub 完稿 loop、`9c3b86f feat(swr): SWR 階段 5` 等近期 commit 都有動 line_bot
- 「整合進 ai_hub」是**前端 UI** integration、後端 webhook / capability 還在用

**Round 2 必做**：
1. Grep `line_bot` / `facebook_bot` / `instagram_bot` 在以下位置的 caller：
   - `src/app/api/line/*` / `src/app/api/facebook/*` / `src/app/api/instagram/*` route
   - `src/lib/line/*` 等 server-side handler
   - `supabase/migrations/` 是否還在 seed 這些 capability
2. 訂正 Round 1 「該清理」結論為「**這些 capability 後端還在用、不能清**」（或反過來確認真該清、給具體證據）
3. **絕對不准動 capabilities.ts**

---

## 三、Round 1 漏掉的（**Round 2 必補**）

### 補 1：CIS 模組半成品（最重要）

SWR 健檢 Round 4 已明確列：
> 「3 個 cis_* table（cis_clients / cis_pricing_items / cis_visits）完全不存在、但前端 3 個 page (`/cis/page.tsx` / `/cis/[id]/page.tsx` / `/cis/pricing/page.tsx`) + 3 個 entity hook 存在、用戶進去 hook call 會炸」

這是 6 層 audit **該抓但漏的 L1 + L5 對齊問題**。

**Round 2 必做**：
1. 證實 3 個 cis_* page 存在
2. 證實 3 個 cis_* entity hook 存在
3. 證實 3 個 cis_* DB table **不存在**（grep migrations 是否曾 CREATE）
4. 在 Round 2 報告新增段落「6 層 audit Round 1 漏項：CIS 模組 L1/L5 對齊破洞」
5. 列建議：要嘛補 DB schema、要嘛砍前端 page。**不要動 code**、只列建議

### 補 2：紅線 D 業務 API 的 closed-period guard

Round 1 只 grep `forceUnlock / reopenTour / adminOverride / bypassPeriodLock` 命名清單 0 處就結論守住。**但紅線 D 真實意涵更廣**：
> 「API route 寫入 receipts / payment_requests / disbursement / journal_vouchers 時、必 check 不在 closed period / closed tour、否則 reject」

**Round 2 必做**：
1. Grep 所有寫 `receipts` / `payment_requests` / `disbursement_orders` / `journal_vouchers` / `salary_settlements` 的 API route
2. 對每個 API、檢查是否有「先 check closed period / closed tour」邏輯
3. 把「沒 check 的 API」列出來、**這才是紅線 D 真實漏洞**
4. 寫進 Round 2 報告新段落

### 補 3：L4 狀態守門靜態掃描（不能因 DB 不通就 skip）

Round 1 因 DB 不通直接 skip L4。**但靜態 grep 完全可做**：

**Round 2 必做**：
1. Grep `is_row_editable` / `is_editable` / `closed_at` / `period_closed` / `is_closed` 在 codebase 出現位置
2. Grep `tour_status === 'closed'` / `status === 'confirmed'` / 類似的狀態判斷
3. 列出「哪些表有狀態守門、哪些沒有」的矩陣（靜態分析、不需要 DB）
4. 補進 Round 2 報告 L4 章節

### 補 4：Pre-existing TypeScript error

Round 1 commit 時用 `--no-verify` 跳 `tsc --noEmit`、原因是 `.next/dev/types/validator.ts` 引用不存在的 CIS page。**這本身就是 audit finding**、Round 1 沒寫進報告。

**Round 2 必做**：
1. 確認 `npm run type-check` 確實壞（執行一次、抓 error 訊息）
2. 分析根因（CIS page 引用、Next.js dev 殘留、或其他）
3. 列「修法選項」（清 .next / 砍 CIS page / 補 CIS DB）、**不執行**
4. 寫進 Round 2 報告「pre-existing TypeScript error 阻擋正常 commit」

---

## 四、Round 2 紀律（嚴守）

### 紅線 1：**絕對不修任何 code**
- 不准 rename 變數
- 不准動 capabilities.ts
- 不准砍 page
- 不准動 migration
- 純文件產出

### 紅線 2：commit 規矩
- 寫完 Round 2 報告 → commit → 不 push
- commit message：`audit(round-2): 訂正 + 補漏 — overnight 2026-05-20`
- **這次 type-check 還是會炸（pre-existing）、繼續 --no-verify、但 commit message 要加註記** `pre-existing tsc error not introduced by this commit`

### 紅線 3：產出檔
- `workspace/_meta/architecture/2026-05-20-round2-audit.md` — Round 2 訂正 + 補漏報告（**新檔**）
- 更新 `OVERNIGHT-PROGRESS-2026-05-20.md` 加 Round 2 段
- 更新 `OVERNIGHT-LEARNINGS-2026-05-20.md` 加 Round 2 心得

### 紅線 4：報告格式（學 SWR 健檢 Round 2）
- 開頭：救護車式總覽（Round 1 結論 vs Round 2 訂正）
- 訂正章節：每條 Round 1 抓錯的、列「Round 1 講 vs Round 2 實況」對照表
- 補漏章節：4 個新 audit 點、每個都要 grep 證據

### 紅線 5：產出後留給 Claude / William 覆查
不要主動進 Round 3、不要主動修 code。寫完 Round 2 commit 就停手、等下次 ping。

---

## 五、開工指令

讀完這份派工書、回我「Round 2 收到、開始訂正紅線 B」、然後開始。

工作目錄：`/Users/william/Projects/yizhan-erp`
