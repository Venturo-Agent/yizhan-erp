# 如何 Apply Migration（對齊 Migration SOP）

> ⚠️ 本檔取代舊版「Studio SQL Editor 手跑 DDL」流程。
> 舊流程跟 Migration SOP 矛盾、且會造成 code repo 跟 production 漂移。
> 完整 SOP 請看 [`CLAUDE.md` § Migration SOP](../CLAUDE.md)。

---

## 為什麼不准走 Studio SQL Editor 手跑

過去這份檔案教大家「複製 SQL 貼到 Supabase Dashboard SQL Editor 跑」。**這條路已封死**、原因：

- SQL 直接打在 production、code repo 沒留 migration 檔 → 下個工程師 `git pull` 不知道 schema 真實狀況
- 沒 commit trail → audit / rollback 都做不到
- Schema 跟 code 不同步 → entity hook / types 對不上會炸

---

## 標準流程（必走）

```
1. 寫    →  supabase/migrations/YYYYMMDDHHMMSS_<purpose>.sql
2. Commit →  git add migration 檔 + 相關 code 改動 → git commit
3. Apply →  MCP mcp__supabase-aierp__apply_migration
4. Reload →  動 column 時 NOTIFY pgrst, 'reload schema'
5. 驗證 →  mcp__supabase-aierp__execute_sql 跑 SELECT/COUNT 確認
6. Push  →  git push → GitHub → Coolify → Vultr 自動部署
```

### 1. 寫 migration 檔

放在 `supabase/migrations/`、檔名格式 `YYYYMMDDHHMMSS_<purpose>.sql`：

- 時間戳到秒（避免 ordering 衝突；同戳會退化為檔名次序、相依不可靠）
- 開頭註解寫「**為什麼**」（不只是「做什麼」）
- 用 `BEGIN; ... COMMIT;` 包圍
- 加 `IF EXISTS` / `IF NOT EXISTS` / `ON CONFLICT` → 讓 migration idempotent、可重跑

範例：

```sql
-- 2026-05-29: 加 user_preferences 表、跨裝置同步小工具設定
-- 為什麼：原本只存 localStorage、換瀏覽器就丟、客戶抱怨好幾次
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  preference_value jsonb NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

-- 走中央 RLS procedure、不散刻 CREATE POLICY
SELECT setup_workspace_scoped_rls('user_preferences');

COMMIT;
```

### 2. Commit migration 檔

```bash
git add supabase/migrations/20260529120000_add_user_preferences.sql
git add src/data/entities/user-preferences.ts   # 相關 code
git commit -m "feat(prefs): 加 user_preferences 跨裝置同步"
```

### 3. Apply 到 production

用 MCP（**唯一通道**、不准走 Studio SQL Editor）：

```
mcp__supabase-aierp__apply_migration
  project_id: aawrgygqgemgqssflfrx
  name: 20260529120000_add_user_preferences
  query: <SQL 內容>
```

### 4. 動 column 後 reload schema cache

動到欄位（CREATE/ALTER/DROP COLUMN）後、client 查新欄位會炸「column does not exist」。
要等 PostgREST 下一分鐘 auto-reload、或主動 NOTIFY：

```
mcp__supabase-aierp__execute_sql query="NOTIFY pgrst, 'reload schema';"
```

### 5. 驗證 apply 結果

```
mcp__supabase-aierp__execute_sql query="SELECT count(*) FROM user_preferences;"
mcp__supabase-aierp__execute_sql query="SELECT table_name FROM information_schema.tables WHERE table_name = 'user_preferences';"
```

RLS migration 額外驗：用 service_role 模擬不同 user 視角看資料隔離有沒有過。

### 6. Push 部署

```bash
git push origin main
```

→ GitHub 觸發 Coolify webhook → Coolify 在 Vultr 自動 build + deploy → erp.venturo.tw 上線

---

## 例外：緊急 hotfix

production 現場壞、user 卡住、不能等正常流程：

1. 用 MCP `apply_migration` 立刻 apply 救命
2. **當天**必補 migration 檔 commit（不可超過 24h）
3. commit message 寫：`fix(hotfix): <what> — already applied to production at <time>`

---

## 破壞性 migration：必附反向 SQL

砍欄位 / DROP POLICY / DROP TABLE / 改 NOT NULL → 必在 migration 末尾用註解寫 reverse SQL：

```sql
COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_xxx ON public.yyy;
-- DROP FUNCTION IF EXISTS public.fn_xxx();
-- COMMIT;
```

非破壞性（純加欄位、加 index、seed 資料）不強制寫 reverse。

---

## 違規模式（不要再犯）

- ❌ MCP `execute_sql` 跑 DDL、檔案沒進 repo → production 動了但 code 不知道
  - DDL 必走 `apply_migration`（會自動建立 migration record + 留檔）
  - `execute_sql` 只跑 SELECT / 驗證 / 一次性資料 fix
- ❌ Migration 檔在 code repo、但忘了 apply → 下個 dev 跑 `db push` 撞 collision
- ❌ 直接 SQL editor 在 Supabase Studio 手動跑 → 沒檔案、沒 trace、就是這份檔案以前教的反模式
- ❌ 同 14 位時間戳兩個 migration → ordering 退化為檔名次序、相依不可靠
  - 走 `npm run audit:migration-timestamps` 偵測

---

## 草稿區（還沒準備好 apply 的 SQL）

放 `supabase/migrations-pending/`、**不會**被 Supabase CLI 拿來跑。
詳見該目錄的 README。**唯一**草稿入口、不要散在其他地方。

---

## 跑 audit 偵測 migration 健康度

```bash
npm run audit:rls                   # 6 層架構 / RLS 偏離偵測
npm run audit:writes                # DB trigger × API 同表雙寫偵測
npm run audit:migration             # rollback 覆蓋率
npm run audit:migration-timestamps  # 同戳衝突偵測（B13 新加）
```

動表 / 動 RLS / 動中央 module 前必跑、新表上線前必綠。
