# Migration SOP（2026-05-13 黑羽 + William 拍板）

> 主檔索引在 `CLAUDE.md` § Migration SOP。

**核心紀律：本地寫檔 → git commit → MCP `apply_migration` apply 到 production**。
不可在 Supabase Studio SQL editor 直接跑 DDL 而不留檔 — 會造成 code repo 跟 production 漂移、未來人 git pull 不知道 schema 真實狀況。

---

## 標準流程

### 1. 寫 migration

- 檔名：`supabase/migrations/YYYYMMDDHHMMSS_<purpose>.sql`
- 命名：時間戳排序（避免 ordering 衝突）
- 內容：標頭註解寫「為什麼」（不只是「做什麼」）、加 `BEGIN; ... COMMIT;` 包圍
- 用 `IF EXISTS` / `IF NOT EXISTS` / `ON CONFLICT` 讓 idempotent、可重跑

### 2. 驗證 SQL 語法（不 apply）

```bash
# local dry-run
cat supabase/migrations/XXX.sql | psql --variable=ON_ERROR_STOP=1 --dry-run
```

### 3. Commit

先 git add migration 檔 + 相關 code 改動 → git commit。

### 4. Apply

用 MCP `mcp__supabase-aierp__apply_migration`：

- project_id：`aawrgygqgemgqssflfrx`
- name：用 migration 檔名去 `.sql`
- query：貼 SQL 內容

### 4.5. 動 column 後 reload schema cache

不然 client 查新欄位炸「column does not exist」、要等 PostgREST 下一分鐘 auto-reload。

```
mcp__supabase-aierp__execute_sql query="NOTIFY pgrst, 'reload schema';"
```

### 5. 驗證 apply 結果

用 `mcp__supabase-aierp__execute_sql` 跑 count / SELECT 確認；RLS migration 額外用 service_role 模擬 user 視角驗。

### 6. Push

apply 成功 + 驗證過後 `git push` → **GitHub → Coolify 自動部署到 Vultr**。

---

## 例外：緊急 hotfix

緊急修 production（user 現場壞、不能等 commit）：

- 用 MCP `apply_migration` 立刻 apply 救命
- **救完當天必補 migration 檔 commit**（不可超過 24h、不然 audit 跑不到）
- commit message 寫 `fix(hotfix): <what> — already applied to production at <time>`

---

## 違規模式（不要再犯）

- ❌ MCP `execute_sql` 跑完 DDL、檔案沒進 repo → production 動了但 code 不知道（DDL 必走 `apply_migration`、留 migration 檔）
- ❌ Migration 檔在 code repo、但忘了 apply → 下個 dev 跑 `db push` 撞 collision
- ❌ 直接 SQL editor 在 Supabase Studio 手動跑 → 沒檔案、沒 trace

---

## 破壞性 migration：必附反向 SQL

砍欄位 / DROP POLICY / DROP TABLE / 改 NOT NULL → 必在 migration 末尾用註解寫 reverse SQL：

```sql
COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_attractions_set_created_by ON public.attractions;
-- DROP FUNCTION IF EXISTS public.set_shared_data_created_by();
-- -- 還原 5/11 policy（從備份 SQL 抓）
-- COMMIT;
```

非破壞性的（純加欄位、加 index、seed 資料）不強制寫 reverse。
