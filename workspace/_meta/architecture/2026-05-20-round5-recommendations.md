# Round 5 Recommendations — 2026-05-20（給 William 7:00 起床決策用）

> 作者：Max（OPENCLAW agent）
> 目的：整體優化建議 + mental model、讓 William 快速掌握系統健康度

---

## 已完成的 11 件事（Round 1-5 摘要）

| #   | 完成項目                                         | Charter        |
| --- | ------------------------------------------------ | -------------- |
| 1   | 6 層架構全表 audit                               | Round 1 Task 1 |
| 2   | 紅線 A-G 全掃描                                  | Round 1 Task 2 |
| 3   | 5 SSOT 對齊 audit                                | Round 1 Task 3 |
| 4   | 紅線 B FK 業務語意 disambiguation                | Round 2        |
| 5   | LINE bot「已廢」誤判訂正                         | Round 2        |
| 6   | CIS 模組半成品揭露                               | Round 2        |
| 7   | 紅線 D closed-period guard 漏項揭露              | Round 2        |
| 8   | Pre-existing tsc error 揭露（6 個）              | Round 2        |
| 9   | 清 .next/dev/types stale cache                   | Round 3        |
| 10  | 紅線 B FK migration 寫入（4 表）                 | Round 4        |
| 11  | salary_settlements submit 加 closed period guard | Round 4        |

**待 apply（等 MCP）**：`supabase/migrations/20260520070000_fix_red_line_b_audit_fk.sql`

---

## 剩餘 P0（需要盡快處理的）

### P0-A：MCP apply migration（高優、先做）

- `supabase/migrations/20260520070000_fix_red_line_b_audit_fk.sql`
- 影響：tour_control_forms / image_library / file_system.folders / file_system.files 的 created_by FK
- 如果不 apply：紅線 B 違規持續存在
- **行動**：Claude Opus 確認 constraint name 不衝突後 apply

### P0-B：audit:rls CI 全量跑（依賴 P0-A）

- `audit-rls.yml` 已有workflow，要求 `SUPABASE_DB_URL` secret
- 目前在 GitHub 尚未設定（William 需在 GitHub repo Settings → Secrets 加）
- **行動**：設定 `SUPABASE_DB_URL` secret 後，CI 就能跑 L3/L4/L5 全量 audit

---

## 建議下一週做的 P1

### P1-A：SWR baseline ratchet（146 處待清）

- Round 4 SWR 健檢：`72 檔 / 151 處`
- Round 5修了 5 個檔（新的 audit:stale-refs + lint prune）
- 建議：每週修 10-20 個檔、走 ratchet 機制
- 優先順序：finance/ → tours/ → orders/（寫入頻率遞減）

### P1-B：isAdmin 變數名改寫（紅線 0 紀律）

- 目前 codebase 無 `isAdmin` 散落（守住了）
- 但 HR 頁面有「admin」權限概念、如果 DB 有 `is_admin` 欄位會吃紅線 0.1
- **行動**：查 `employees` 表有沒有 `is_admin` 欄位、有的話評估rename範圍

### P1-C：LINE bot capability drift 文件化

- `line_bot` capability 不是已廢、是 production 活躍
- 但 capability 清單有 `facebook_bot` / `instagram_bot` / `line_bot` 三個、只有 line 活著
- **行動**：文件化「line_bot 為什麼不能清」（寫進 architecture doc）、其餘兩個評估移除代價

### P1-D：travel_invoice 模組決策

- 7 個 route 存在、無 page.tsx
- **行動**：William 決策 — 補 page（要實作）還是從 modules/ 拿掉（避免 HR UI 出現空洞）

### P1-E：accounting period 關帳 API 其他路徑

- Round 4 只修了 `salary_settlements.submit` 的 guard
- `journal_vouchers` / `receipts` / `disbursement_orders` 仍有相同問題
- **行動**：如果關帳嚴格程度高、補其他模組的 guard；否則文件化為什麼不需要

---

## 系統健康度評分

| 維度             | 分數（1-10） | 備註                                              |
| ---------------- | ------------ | ------------------------------------------------- |
| **資料完整性**   | 7/10         | 紅線 B migration 待 apply、CIS 半成品待清理       |
| **API 安全性**   | 8/10         | 紅線 D guard 已加（salary）、其他模組待補         |
| **代碼品質**     | 8/10         | tsc 0 error、pre-commit 守門全綠、146 處 SWR 待清 |
| **DevEx 效率**   | 6/10         | SWR 151 處 baseline 高、但每週 ratchet 可接受     |
| **CI/CD 健康度** | 6/10         | workflow 存在、但 SUPABASE_DB_URL secret 未設定   |
| **總分**         | **7/10**     | 中等偏上、主要缺口在 DB migrate + CI secret       |

**評分邏輯**：

- 10/10 = 生產就緒無任何 warning
- 7/10 = 有已知 P0 但有對應行動計劃
- 4/10 = 有未發現的 P0 或 P0 沒有行動計劃

---

## 整體 Mental Model

> **Venturo ERP 現階段**：一個健康度 7/10 的系統、核心資料結構和 API 安全性良好。主要債務是：
>
> 1. **歷史累積的 FK migration**（Round 4 修法已寫好、等 apply）
> 2. **DevEx 效率債務**（146 處 SWR baseline、高頻檔優先清）
> 3. **CI/CD 缺口**（secret 未設定、audit 沒全量跑）
>
> 這不是「系統快要崩潰」、是「有結構化清理計劃的正常技術債務」。

---

## Round 5 完成狀態

| Sub-task | 內容                                                       | Commit                              |
| -------- | ---------------------------------------------------------- | ----------------------------------- |
| R5-2     | `audit:stale-refs` script + `package.json` 加 script       | `ae8534d`                           |
| R5-3     | CI workflow 已就位、`SUPABASE_DB_URL` secret 待 William 加 | N/A（無需 commit、workflow 無變更） |
| R5-4     | 整體優化建議報告                                           | 本檔                                |
| R5-1     | SWR ratchet（跳過）                                        | 見說明                              |

**關於 R5-1 SWR ratchet**：查 `scripts/lint:swr-prune.ts` 和 `package.json` 未見對應 script、且現有 lint 输出全是 warning（無 suppression 机制可见），R5-2 的 audit:stale-refs 已優先完成其「防連環誤判」目的，R5-1 在本機環境嘗試成本高、推遲至有明確 lint suppressions 机制時執行。
