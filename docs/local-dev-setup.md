# 本機開發環境 setup（給 Alex / Logan / Max / Robin / 新人）

> 2026-05-23 Sprint A 完工、William 拍板「人人本機跑 supabase、不再動 production 試錯」
>
> 上層概念：`workspace/_meta/architecture/2026-05-23-測試環境概念.md`

---

## 為什麼要做這個

過去 production-only 開發踩過：
- 5/14 trigger × API 雙寫撞 unique、自此無人能建租戶
- 4/20 動 workspaces RLS、全員登不進去
- 動 schema 怕死客戶資料

從現在起：**改 schema / 試新功能 → 跑本機 supabase、reset 不影響任何人**。

---

## 一次性安裝（每台 Mac 跑一次）

```bash
# 1. Supabase CLI
brew install supabase/tap/supabase

# 2. Docker（已有 Docker Desktop / colima 跳過）
brew install colima docker  # 任選一個
```

---

## 啟動本機 supabase（每次開機跑）

```bash
# 1. 啟 docker daemon（colima 用戶）
colima start

# 2. 進專案目錄
cd ~/Projects/yizhan-erp

# 3. 跑 supabase
supabase start
```

`supabase start` 第一次跑會 pull 一堆 image、可能 5-10 分鐘。完成後印：

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
        anon key: eyJhbGciOi...（127 字元 JWT）
service_role key: eyJhbGciOi...（127 字元 JWT）
```

**保存 anon key 跟 service_role key、下一步要用**。

---

## env 設定

```bash
# 1. 複製範本
cp .env.development.local.example .env.development.local

# 2. 編輯、填上面兩個 key
code .env.development.local
```

必填欄位：
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- `SUPABASE_SERVICE_ROLE_KEY=`

其他 secrets（譬如 encryption key）可以這樣產：

```bash
openssl rand -base64 32  # 跑 4 次、分別填四個 key 欄位
```

---

## 灌假資料

```bash
npm run seed:local
```

灌出來：
- workspace `LOCAL_TEST`
- 1 個假員工 `william@local`（密碼 `localdev`）
- 1 個假客戶 / 1 個假 tour / 1 個假 order
- 5 個收款方式（含永豐 2 個 provider）

需要重灌？

```bash
npm run seed:local -- --reset
```

---

## 啟動 dev server

```bash
npm run dev
```

打開 `http://localhost:3000`、用 `william@local` / `localdev` 登入。

---

## 永豐金流 mock 流程測試

1. 進 `/finance/payments` → 新增收款
2. 收款方式選「永豐線上刷卡」（剛剛 seed 進去的）
3. row 下方展開：填 Email + 7 天 → 產連結
4. 開新分頁 → mock 刷卡頁 → 假填卡號 → 看 receipt 自動 `confirmed`

---

## reset 整個本機 DB

```bash
# 砍掉重來、跑 migration + Seed
supabase db reset
npm run seed:local
```

`db reset` 會：
- DROP 所有 schema
- 跑 `supabase/migrations/*.sql` 從頭灌一次
- 不會動 production

---

## 環境停掉

```bash
supabase stop    # 停 supabase containers
colima stop      # 停 docker daemon（可選、不停會持續吃 RAM）
```

---

## 常見問題

### Q1: `supabase start` 卡在 pull image

第一次跑要 5-10 分鐘。網路慢就泡杯咖啡。再卡就 `supabase start --debug` 看 log。

### Q2: port 衝突

預設 port：
- 54321 — Supabase API
- 54322 — Postgres
- 54323 — Studio

被其他 service 佔用？改 `supabase/config.toml` 的 `[api] port` / `[db] port` 然後 `supabase stop && supabase start`。

### Q3: seed 失敗 / table 不存在

migration 沒跑完？先 `supabase db reset` 把所有 migration 重跑一次再 `npm run seed:local`。

### Q4: 我已經有 `.env.local`、會衝突嗎？

不會。Next.js auto-load 順序：

```
.env.development.local  ←【你新建這個、本機 dev 走這條】
.env.local              ←【原本連 production 那條】
.env.development
.env
```

`.env.development.local` 蓋過 `.env.local`、只在 `NODE_ENV=development` 載入。`npm run build` (production) 不會讀。

### Q5: 本機資料想保留、不要每次 reset

`supabase stop` 不會清資料、`supabase start` 起來資料還在。
要清資料才跑 `supabase db reset`。

---

## 動 schema 的安全流程

從現在起、任何 schema 改動走這個流程：

```
本機改  (supabase start + 寫 migration + db reset 驗證)
   ↓
PR 開出去
   ↓
CI 自動建 Supabase branch (Phase B 完成後)
   ↓
跑 migration + audit:rls
   ↓
過了才 merge
   ↓
production apply
```

**不准**直接 `mcp__supabase-aierp__apply_migration` 跳過本機驗證（除非緊急 hotfix）。

---

## 給 William 的補充

- 本機 supabase 是「**沙箱**」、隨便試、reset 不影響任何人
- 永豐金流目前是 `SINOPAC_ENV=mock` 純 UI demo、Phase 2 拿到 UAT 特店號再換
- seed-local.ts 灌的是「最少能跑」的資料、其他客戶 / 帳單靠 UI 累積
