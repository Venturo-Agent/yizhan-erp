# Round 4 派工書 — 2026-05-20 06:20（真上線模式）

> 派工人：Claude Opus（覆查員 + MCP 持有者）
> 承辦：OPENCLAW Max
> 模式：**動真 code、真寫 migration、真 commit**（但 OPENCLAW 不 apply 不 push、由 Claude Opus 走 MCP 跟 push）
> 上線時程：今早 9 點前完成 Coolify 部署

---

## 你是誰

延續 Round 1-3 的 Max 人格。**本輪是真修法、不是 audit**。Round 1-3 累積的真實 P0 finding 已確認，你動手做修法。

---

## Round 1-3 累積已確認的真實 P0

| # | finding | 狀態 |
|---|---|---|
| 1 | `tour_control_forms.created_by/updated_by` FK 指 auth.users，應指 employees(id) | ✅ 確定違反紅線 B |
| 2 | LINE bot capability「不能清」 | ✅ 訂正完、無事 |
| 3 | CIS / departments 殘留 | ✅ 已清乾淨（清 .next/dev） |
| 4 | tsc error 6 個 | ✅ Round 3 已修 |
| 5 | `salary_settlements submit` 無 closed period guard | ⏳ 本輪修 |
| 6 | image_library / file_system / email_system 業務語意需 disambiguation | ⏳ 本輪先 audit、若確定違反就一起修 |

---

## 你的三個 sub-task

### Sub-task A — 業務語意 disambiguation（先做、最安全）

**範圍**：`image_library` / `email_accounts`（在 email_system schema 內）/ `file_system.files` / `file_system.folders` 共 4 個表 / table-group。

**方法**：
1. Grep API caller：`src/app/api/**/*.ts` 看哪些 route 寫入這些表
2. Grep schema 註解：對應 migration 檔 `COMMENT ON TABLE` 看業務語意
3. 比較 `tour_control_forms`（已確認是 ERP 業務）跟這 4 個表的使用模式差異
4. 對每個表結論：「是 ERP 業務（→ employees）」or「是 user 個人物件（→ auth.users）」

**產出**：寫進 `2026-05-20-round4-audit.md` 第一章「Sub-task A」

---

### Sub-task B — 紅線 B FK migration（你寫、不 apply）

**範圍**：對 Sub-task A 確定違反的所有表 + `tour_control_forms`（已確認違反）

**做法**：
1. 在 `supabase/migrations/` 寫新 migration 檔
2. 檔名：`YYYYMMDDHHMMSS_fix_red_line_b_audit_fk.sql`（時間戳要對、不要撞）
3. 內含：
   - BEGIN; ... COMMIT;
   - DROP CONSTRAINT IF EXISTS <old>
   - ADD CONSTRAINT ... REFERENCES public.employees(id) ON DELETE SET NULL
   - 對 updated_by 同樣處理
   - 末尾註解寫 reverse SQL（如何 rollback）
4. 不要 apply（CLAUDE.md 規定 MCP 是唯一通道、你沒這個工具）
5. Commit、不 push

**Commit message**：`fix(rls): 紅線 B FK 改指 employees — Round 4`

---

### Sub-task C — salary_settlements closed period guard（改 src code）

**範圍**：`src/app/api/hr/salary-settlements/[id]/submit/route.ts`（或對應路徑、自己找）

**做法**：
1. 找 submit route 的 handler
2. 在 handler 開頭、寫入 DB 之前、加 closed period check：
   - 從 settlement 拿 period_id（看實際 schema）
   - 查 `accounting_periods` 表的 `is_closed` 欄位（看實際 schema、可能叫 `closed_at` not null）
   - 如果 closed → return 409 with dbErrorResponse-friendly payload
3. 用 `db-error-translate` 或 `dbErrorResponse` 包錯誤 message（中央 module、CLAUDE.md 規定）
4. 跑 `npm run type-check` 確認 0 error
5. 跑 `npm run lint` 確認 0 new console.log / 沒 as any
6. Commit、不 push

**Commit message**：`fix(hr): salary_settlements submit 加 closed period guard — 紅線 D`

---

## 規矩（必守）

### 紅線 1 — 動 production 的紀律
- ✅ 寫 migration 到 `supabase/migrations/`
- ❌ **絕對不准跑 MCP supabase apply_migration**（你沒這個工具、CLAUDE.md 只允許 Claude 走）
- ❌ **絕對不准 git push**（留給 Claude 覆查後 push）

### 紅線 2 — 改 src code 的紀律
- ❌ 不准 `--no-verify` 跳 hook（這次該通、tsc Round 3 已修）
- ❌ 不准 `as any` / `: any` 蓋 type error
- ❌ 不准 mock / fake data
- ✅ 用中央 module（`@/lib/db-error-translate` / `@/lib/codes`）
- ✅ Commit 前必跑 `npm run type-check`（必過）

### 紅線 3 — Commit 紀律
- 每個 sub-task **獨立 commit**（不要混 A + B + C 進一個）
- Commit message 標 Round 4
- 不准 amend、不准 `git add -A`、用 `git add <specific files>`
- 不准 push

### 紅線 4 — 卡住怎麼辦
- 第一次卡 → 停手、寫 `OVERNIGHT-PROGRESS-2026-05-20.md` 註記、跳下個 sub-task
- 不准連續燒 token 試 A→B→C→D

### 紅線 5 — 收工
- 寫 Round 4 段進 `OVERNIGHT-LEARNINGS-2026-05-20.md`（用既有檔追加、不寫新檔）
- 最後 commit 標 `audit(round-4): 修法完成、等 Claude 覆查 + apply + push`
- 停手

---

## 你要先做的事（開工前）

1. 讀本派工書（你正在讀）
2. 確認當前 git status 乾淨
3. 跑 `npm run type-check` 確認 baseline 是 0 error（Round 3 已修、應該 0）
4. 開始 Sub-task A

---

## Claude Opus 收尾流程（你不用管、給你知道）

OPENCLAW 寫完 Sub-task A + B + C、commit 完、stop。然後 Claude Opus：
1. 覆查每個 commit
2. 走 MCP apply_migration 套用 Sub-task B 的 migration
3. 跑 `npm run audit:rls` 確認綠
4. `git push origin main` 觸發 Coolify
5. 看 Coolify deploy + production logs
6. Telegram 通知 William

---

**開工指令會由 dispatch 給你。看到「Round 4 繼續推進」就開始。**
