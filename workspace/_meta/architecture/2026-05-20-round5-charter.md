# Round 5 派工書 — 2026-05-20 06:50（SWR + 整體優化）

> 派工：Claude Opus
> 承辦：OPENCLAW Max
> 模式：延續 Round 4 真上線（改 src code + commit、不 push、Claude 收尾 push）
> 重點：**SWR baseline ratchet down + 整體優化補強**

---

## 你的 4 個 sub-task（自排順序）

### Sub-task R5-1：SWR baseline ratchet down（5 個檔）

**背景**：SWR 健檢 Round 4 結論 `baseline: 72 檔 / 151 處`、走 ratchet 機制（修一個少一個）。本輪改 5 個高頻檔。

**做法**：
1. 跑 `npm run lint -- --suppressions-location .eslint-suppressions.json` 看當前 baseline
2. 從 baseline 挑 **5 個檔**、選擇優先順序：
   - 寫入頻率最高（看 `finance/` / `tours/` / `orders/`）
   - 改動範圍小（< 10 line change）
   - 不在 service layer 共用模組
3. 對每個檔：
   - 改 `supabase.from('X').insert/update/delete` → 用 entity hook 的 `addX / updateX / deleteX`
   - 寫入後 invalidate 走 `invalidateXxx()` 而非散刻 `mutate(key)`
   - 跑 `npm run lint:swr-prune` 拔該檔 baseline entry
4. 整體 commit 1 個：`fix(swr): ratchet 清 5 個 baseline 檔 — Round 5`
5. 跑 type-check 確認 0 error

**產出**：Round 5 audit 段紀錄修了哪 5 個檔、baseline count 從 151 → ?

---

### Sub-task R5-2：寫 `audit:stale-refs` 新 audit script

**背景**：Round 2/3 連環踩坑（OPENCLAW 看 `.next/dev/types/validator.ts` 推論 CIS page 存在、實際 source 早被砍）。寫一個 audit script 防再犯。

**做法**：
1. 寫 `scripts/audit-stale-refs.ts`
2. 邏輯：
   - 掃 `.next/dev/types/validator.ts`（如果存在）
   - 對每個 `import ... from '../../../src/...'` 路徑、轉 absolute path
   - 跑 `fs.existsSync()` 確認檔案真存在
   - 不存在 → log warn + 建議 `rm -rf .next/dev/types`
3. 加進 `package.json` `scripts.audit:stale-refs`
4. 跑一次確認 0 違反（Round 3 已清過）
5. Commit：`feat(audit): audit:stale-refs 偵測 .next dev cache stale 引用 — Round 5`

---

### Sub-task R5-3：確認 audit:rls CI 整合

**背景**：Round 1 提及 audit:rls 在 CI 應能跑 L3/L4/L5 全量、但需要 `SUPABASE_DB_URL` secret。

**做法**：
1. 讀 `.github/workflows/audit-rls.yml`
2. 確認是否要求 `SUPABASE_DB_URL` secret
3. 如果 yml 已就位但 secret 沒設、寫進 Round 5 audit「待 William 在 GitHub 加 secret」
4. 如果整個 workflow 沒寫、補一份基礎版 yml（cron + PR trigger）
5. Commit：`ci: audit:rls workflow 確認 — Round 5`（如果改了）

---

### Sub-task R5-4：寫整體優化建議報告

**背景**：Claude Opus 一輪輪累積、需要一份整體優化清單給 William 7 點起床決策。

**做法**：
1. 寫 `2026-05-20-round5-recommendations.md`
2. 內容：
   - **已完成的 11 件事**（Round 1-5 各 commit 摘要）
   - **剩餘 P0**（等 MCP apply 的 migration）
   - **建議下一週做的 P1**（剩餘 146 處 SWR baseline、isAdmin rename 範圍評估、bot capability 文件化「為什麼不能清」）
   - **整體系統健康度評分**（給 William 一個 mental model）

---

## 規矩（跟 Round 4 一樣）

- ❌ 絕對不 push、絕對不 apply migration
- ❌ 不准 --no-verify / as any / git add -A
- ✅ 每個 sub-task 獨立 commit、commit message 標 Round 5
- ✅ 跑 type-check 必過

---

## 收工

寫 Round 5 段進 `OVERNIGHT-LEARNINGS-2026-05-20.md`、commit 標 `audit(round-5): SWR ratchet + 整體優化完成 — overnight 2026-05-20`、停手等 Claude Opus 覆查 + push。

---

**Round 4 已 push 上線、Coolify deploying。Round 5 立刻開工。看到「Round 5 繼續推進」就開始。**
