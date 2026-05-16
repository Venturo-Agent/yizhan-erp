# 跨租戶 + 並發測試說明

> 2026-05-12 Logan 寫、為了上線前壓測「跨 workspace 資料隔離」+「並發撞號」這兩個最關鍵的多租戶資安 / 正確性議題。

---

## 兩套測試的責任分工

| 測試套件 | 目的 | 框架 | 跑在哪 |
|---|---|---|---|
| `tests/concurrency/*.test.ts` | 壓 RPC 編號函式、確認 advisory lock 真的鎖住 | Vitest | Node + Supabase service_role REST |
| `tests/e2e/cross-tenant.spec.ts` | 驗 RLS + 應用層雙重擋下跨 workspace 攻擊 | Playwright | 真實 Supabase + Next.js dev server |
| `tests/e2e/security/cross-workspace.spec.ts`（既有 skeleton） | 同上、更詳細的 entity-by-entity case 列表（保留參考） | Playwright | （目前 `.skip`） |

兩個都是「上線前必跑」、但目前 **不在 CI**、原因見下面 #CI 章節。

---

## 並發測試（B11）

### 涵蓋的 RPC

| RPC | 檔案 | 格式 | scope |
|---|---|---|---|
| `generate_employee_number` | `employee-number-race.test.ts` | `E001` (3 位) | per-workspace |
| `generate_supplier_code` | `supplier-code-race.test.ts` | `S00001` (5 位) | per-workspace |
| `generate_order_number` | `order-number-race.test.ts` | `{tour_code}-O01` (2 位) | per-tour |
| `generate_account_child_code` | `account-child-code-race.test.ts` | `{parent}-N` (不補零) | per-(workspace, parent) |

每個檔案測：
1. **10 並發 call** → 10 個不同編號、連續無跳號
2. **NULL / 空字串 input** → RPC `RAISE EXCEPTION`
3. **scope 互不干擾**（適用時）— 不同 workspace / tour / parent 各自獨立計數

### 怎麼跑

```bash
# 1. 載入 secrets（NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）
source ~/.config/venturo/secrets.env

# 2. 跑單一檔
npm run test -- tests/concurrency/employee-number-race

# 3. 跑全部並發測試
npm run test -- tests/concurrency
```

未 source secrets.env 時、`describe.skipIf(!hasServiceRoleKey())` 會整套 skip、不會誤判失敗。

### Sandbox workspace

每個測試 file 在 `beforeAll` 建一個 `CONCURRENCY-{ts}-{rand}` workspace、`afterAll` truncate 相關 row + 刪 workspace。

**不會污染 production / demo workspace**。即使測試中斷、殘留 workspace 也容易辨識（code prefix `CONCURRENCY-` / `EMP-RACE-` / `SUP-RACE-` / `ORD-RACE-` / `ACC-RACE-`）、可手動清。

清殘留：
```sql
DELETE FROM workspaces WHERE code LIKE 'EMP-RACE-%';
DELETE FROM workspaces WHERE code LIKE 'SUP-RACE-%';
DELETE FROM workspaces WHERE code LIKE 'ORD-RACE-%';
DELETE FROM workspaces WHERE code LIKE 'ACC-RACE-%';
DELETE FROM workspaces WHERE code LIKE 'CONCURRENCY-%';
```

### 哪題會 skip

部分子題（如 `employee-number-race` 的「帶現存 employees」）需要 employees 表的 NOT NULL 欄位、schema 變動快、INSERT 失敗時測試 `console.warn` + return（不爆）。確認本題是否真的有跑、看 stdout log。

---

## 跨租戶 e2e（B12）

### 涵蓋的攻擊面

每個 entity 表（customers / suppliers / contracts / tours / orders / payment_requests / receipts / disbursement_orders）測：

| 攻擊 | 預期擋下層 |
|---|---|
| A 員工 SELECT WHERE workspace_id = B | RLS |
| A 員工 LIST 全部 | RLS（leak detection） |
| A 員工 INSERT workspace_id = B 的 row | RLS WITH CHECK 或 trigger |
| A 員工 UPDATE B 的 row id | RLS USING |
| A 員工 DELETE B 的 row id | RLS USING |
| A 員工打 next API `/api/customers?workspace_id=B` | 應用層 `enforceWorkspaceScope` |

### 怎麼跑

需要兩組真實 workspace + 各自一個員工帳號。建議用：

- **Workspace A**：`TESTUX`（測試用、E001）
- **Workspace B**：`DEMO`（demo workspace、d710436e-...）

```bash
source ~/.config/venturo/secrets.env

# Workspace A
export TEST_WS_A_CODE=TESTUX
export TEST_WS_A_ID=<TESTUX workspace UUID>
export TEST_WS_A_EMAIL=e001@testux.local
export TEST_WS_A_PASSWORD=00000000

# Workspace B
export TEST_WS_B_CODE=DEMO
export TEST_WS_B_ID=d710436e-535e-4618-99a4-71bdd26ddc9f
export TEST_WS_B_EMAIL=demo@gmail.com
export TEST_WS_B_PASSWORD=00000000

# 跑（要 next dev server 在 :3000）
npm run dev &
npx playwright test cross-tenant
```

沒設環境變數時整套 `test.skip`、不會誤判失敗。

### 怎麼準備兩個 workspace 帳號

如果 TESTUX / DEMO 還沒有員工帳號：
1. 登入 admin、到 `/hr/employees` 開一個員工、設 email + password
2. 該員工要有 capability 能讀 customers 等表（用一般 role 即可、不用 admin）
3. 取得該 workspace 的 UUID：
   ```bash
   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/workspaces?code=eq.TESTUX&select=id" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

### 注意

- B 的 customers 表要有至少一筆資料、UPDATE / DELETE 攻擊測試才能跑（沒資料會 `test.skip`、不算失敗）
- 測試會建立一筆 `Cross-tenant test {timestamp}` 命名的 customer 來測 INSERT、結束會清掉（如果 INSERT 真的進得了 B 的話、那就是測試失敗、留下證據）
- 測試**不會**對 B 的真實 row 改任何東西、只測「攻擊被擋」

---

## 為什麼還沒 CI

### 不在 CI 的原因

1. **沒 staging Supabase**：所有測試都打 production aierp。CI 在 production 上跑壓力測試 = 風險
2. **secrets 注入未設**：CI runner 還沒有 `SUPABASE_SERVICE_ROLE_KEY` env 設定（之後接 GitHub Actions secrets）
3. **真實員工帳號**：cross-tenant 測試要兩個真實 email + password、不適合放 CI 環境變數

### 之後接 CI 的計畫

- 等 staging Supabase 建好（或 [supabase branching](https://supabase.com/docs/guides/platform/branching)）
- 並發測試：CI 用 `supabase db branch` 跑、不碰 production
- 跨租戶 e2e：CI 用 staging 帳號（CI secret 注入）
- 兩套測試都加 GitHub Actions workflow、PR 必過

### 現階段的補救

**上線前手動跑一次**：
```bash
source ~/.config/venturo/secrets.env

# Tier 1：並發測試
npm run test -- tests/concurrency

# Tier 2：跨租戶 e2e（要先準備 env vars）
npm run dev &
npx playwright test cross-tenant
```

如果這兩個都過、表示：
- 編號 RPC 真的 lock 住（並發不會撞號）
- RLS + 應用層真的擋下跨 workspace 攻擊（紅線 A 安全）

---

## 紅線對應

| 鐵律 | 哪個測試守 |
|---|---|
| 紅線 A（多租戶隔離） | `cross-tenant.spec.ts` + `cross-workspace.spec.ts` |
| 編號 SSOT（`@/lib/codes.ts` + RPC） | `tests/concurrency/*` |
| 紅線 C（admin client per-request） | 沒測（要看 server log、不適合 e2e）— 留人工 audit |

## 相關檔案

- `supabase/migrations/20260512154000_pr2_generate_employee_supplier_codes.sql` — Phase 1 RPC
- `supabase/migrations/20260512160000_pr2_phase2_order_account_codes.sql` — Phase 2 RPC
- `src/lib/codes.ts` — 編號統一 wrapper（5/12 William 拍板的中央 module）
- `Logan-Workspace/2026-05-12-修復筆記-夜戰計畫.md` — 整體脈絡（B11 / B12）
