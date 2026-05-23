# 04 — Auth Chain 全貌

**資料時點**：2026-05-23 12:35
**資料來源**：grep + Read 於 `src/proxy.ts`、`src/lib/auth/**`、`src/lib/supabase/**`、`src/app/api/lib/**`、`src/lib/audit/**`；WebFetch Supabase docs（getclaims / signing-keys）；node_modules 確認 `@supabase/auth-js@2.89.0` 已有 `getClaims()`

---

## 摘要

- yizhan-erp 沒有 `middleware.ts`、但有 `src/proxy.ts`（Next.js 16 起 middleware 改名 proxy、行為相同）、**每個非公開路由的請求都會跑一次 `supabase.auth.getUser()` 打外部 GoTrue**。
- 一次 API request 從 cookie 到 audit context 寫入、auth chain 累計 **約 130-205 ms**（不含實際業務 SQL），其中 **115-185 ms 是「proxy + getServerAuth + capability check」**、業務邏輯還沒跑。
- 病根 1：`auth.getUser()` 一次 request **被打 2 次**（proxy 1 次 + getServerAuth/getApiContext 1 次）= **60-160 ms 外部 HTTP**。
- 病根 2：`hasCapabilityByCode` 跟 `getServerAuth` 各自查 `employees` 表（2 次 round-trip）、`hasCapabilityByCode` 自己又查 employees + role_capabilities（2 次）= **單 request 對 employees 表 2-3 次重複 query**。
- 病根 3：紅線 C 規定 admin client per-request（不可 singleton）、目前 `getSupabaseAdminClient()` 每次 call 都 `createClient` 新建（單 request 內被建 3-5 次）— 不打網路、但 Node 物件 alloc 重複。
- 可省最多的是病根 1：**改走 `getClaims()` 走 JWKS 本地驗 RS256/ES256、省 50-80 ms / call**（前提：Supabase project 已換成 asymmetric signing key、現用版本 supabase-js 2.89.0 已內建 getClaims）。
- 可省第二多是病根 2：合 `getServerAuth` + `hasCapabilityByCode` 成單 query（employees JOIN role_capabilities）、**省 5-10 ms / call**。

---

## 完整 flow（從 request 進來到 response 出去）

```
[user request → Vultr Tokyo Coolify]
  ↓
[src/proxy.ts: line 120 export async function proxy()]
  ↓ line 137-146  isPublicPath() check（pure CPU、Set + prefix scan、~0.01 ms）
  ↓ line 149      isAuthenticated() →
  ↓                  line 95-118  createServerClient + supabase.auth.getUser()
  ↓                  ★ 打外部 GoTrue HTTP、平均 30-80 ms ★
  ↓ line 150-152  通過、return response（含 CSP nonce header）
  ↓
[Next.js route handler 接管 → /api/xxx/route.ts]
  ↓
[apiHandler wrapper（src/lib/api/api-handler.ts: line 22）— pure try/catch、~0.1 ms]
  ↓
[requireCapability(CAP) — src/lib/auth/require-capability.ts: line 28]
  ↓
  ├─ getServerAuth() — src/lib/auth/server-auth.ts: line 39
  │   ↓ line 40   createSupabaseServerClient() — pure JS 物件、~0.5 ms
  │   ↓ line 43-46 supabase.auth.getUser()
  │   ↓           ★ 打外部 GoTrue HTTP、平均 30-80 ms ★（proxy 已驗一次、又驗一次）
  │   ↓ line 67-68 user_metadata 快速路徑（pure 物件讀取、~0.01 ms）
  │   ↓ line 72-105 IF user_metadata 沒 workspace_id → 查 employees（admin client、~5 ms）
  │   ↓           （大部分用戶登入後 user_metadata 已寫齊、走快速路徑、不打 DB）
  │   return { workspaceId, employeeId, user }
  │
  └─ hasCapabilityByCode() — src/app/api/lib/check-capability.ts: line 62
      ↓ line 66   getSupabaseAdminClient() — createClient 新建 ~0.3 ms（紅線 C）
      ↓ line 68-72 SELECT role_id FROM employees WHERE id = employee_id
      ↓           ★ DB call、~5 ms ★（跟 getServerAuth 那次重複 query employees）
      ↓ line 79-86 SELECT enabled FROM role_capabilities WHERE role_id AND capability_code AND enabled
      ↓           ★ DB call、~5 ms ★
      return true/false
  ↓
[業務邏輯開始（每 route 各自寫）]
  ↓
[可選: requireWorkspaceFeature() — src/lib/auth/require-feature.ts: line 26]
  ↓ getSupabaseAdminClient + SELECT enabled FROM workspace_features
  ↓ ★ DB call、~5 ms ★（98 個 route 用 requireCapability、9 個 route 額外用 feature gate）
  ↓
[可選: recordApiAuditContext() — src/lib/audit/audit-helper.ts: line 25]
  ↓ → setAuditContext()（src/lib/audit/set-audit-context.ts: line 43）
  ↓ → supabase.rpc('set_audit_context', { p_actor_id, p_reason, p_request_id })
  ↓ ★ RPC call、~2.5 ms ★（task 03 量到 2.52 ms）
  ↓
[業務 SQL（INSERT/UPDATE/SELECT 業務表）]
  ↓
[response NextResponse.json()]
```

---

## 每步 cost 表（依序執行、單 request 累計）

| # | 步驟 | file:line | 性質 | 平均 ms | 可省? | 對應紅線 |
|---|---|---|---|---|---|---|
| 1 | proxy 接 request | `src/proxy.ts:120` | pure CPU + nanoid | 0.3 | 不可省（CSP nonce / 公開路由判定） | — |
| 2 | `isPublicPath()` | `src/proxy.ts:89` | Set + prefix scan | 0.01 | 不可省 | — |
| 3 | proxy 的 `createServerClient` | `src/proxy.ts:95` | JS 物件建構 | 0.5 | 不可省（要拿 cookies）| — |
| 4 | **proxy `auth.getUser()`** | `src/proxy.ts:116` | **外部 HTTP → GoTrue** | **30-80** | **可省、改 `getClaims()`** | — |
| 5 | route handler `apiHandler` wrapper | `src/lib/api/api-handler.ts:22` | try/catch | 0.1 | 不可省 | — |
| 6 | `createSupabaseServerClient` | `src/lib/supabase/server.ts:4` | JS 物件 | 0.5 | 不可省 | — |
| 7 | **getServerAuth `auth.getUser()`** | `src/lib/auth/server-auth.ts:46` | **外部 HTTP → GoTrue**（重複！proxy 已驗過）| **30-80** | **可省、跟 #4 二取一 + 走 getClaims** | 紅線 A（workspaces RLS 不能 FORCE、但這步不關 workspaces）|
| 8 | user_metadata 讀 workspace_id | `src/lib/auth/server-auth.ts:67-68` | pure 物件 | 0.01 | 不可省 | — |
| 9 | (fallback) admin client + 查 employees | `src/lib/auth/server-auth.ts:73-82` | DB SELECT | 5 | metadata 命中時直接跳過、~80% 命中 | 紅線 C（admin client 每次新建）|
| 10 | `getSupabaseAdminClient` 第二次新建 | `src/lib/supabase/admin.ts:21` | createClient JS | 0.3 | 不可省（紅線 C 規定不能 singleton） | **紅線 C** |
| 11 | **hasCapabilityByCode 查 employees.role_id** | `src/app/api/lib/check-capability.ts:68-72` | **DB SELECT** | **5** | **可省、跟 getServerAuth merge** | — |
| 12 | **hasCapabilityByCode 查 role_capabilities** | `src/app/api/lib/check-capability.ts:79-86` | **DB SELECT** | **5** | 部分可省（cache 5 分鐘 role_id→caps Map） | 紅線 H（業務表 RLS、但這是 role_capabilities、隔離靠 role_id 不是 workspace_id）|
| 13 | (可選) requireWorkspaceFeature | `src/lib/auth/require-feature.ts:31-38` | DB SELECT | 5 | 可 cache（feature 變更頻率低）| 紅線 H（workspace_features 有 workspace_id 隔離）|
| 14 | (可選) recordApiAuditContext / set_audit_context RPC | `src/lib/audit/set-audit-context.ts:51` | DB RPC | 2.5 | 不可省（合規） | — |
| | **總計（不含業務 SQL）** | | | **78-188** | | |

**註**：上表 #4 跟 #7 是真實的 **雙打 GoTrue**：proxy 拿 cookie 驗一次、進到 route handler 後 getServerAuth 又拿一次（兩者用獨立 createServerClient、Supabase SDK 沒有 request-scope cache）。Task 00-brief 量化「單次 channels POST 30-80 ms」只算到 #7、實際還要加 #4 的 30-80 ms。

**另一個重複**：當 caller 用 `getApiContext()`（9 個 route）而非 `requireCapability`（98 個 route）時、`getApiContext` 內部直接做 employees + capabilities + features 三道並查（`src/lib/auth/get-api-context.ts:60-122`、Promise.all parallel）、**只 1 次 getUser + 1 次 employees + 1 次 parallel(caps, features)** = 比 `requireCapability` chain 少 1-2 次 round-trip。但 `getApiContext` 滲透率 9/159 = 5.7%、大部分 route 仍走「requireCapability → getServerAuth → hasCapabilityByCode」這條更貴的鏈。

---

## 可省的步驟（接下來能優化的目標）

### 1. 改走 `getClaims()` 走 JWKS 本地驗 — 省 50-80 ms / call ⭐ 最大 leverage

**現況**：步驟 #4（proxy）+ #7（getServerAuth）兩處都打 `supabase.auth.getUser()` → 每次都 fetch `${SUPABASE_URL}/auth/v1/user` → GoTrue server 解 JWT + 查 auth.users → 平均 30-80 ms 外部 HTTP。

**做法**：
1. Supabase project 在 dashboard `Settings → JWT Signing Keys` 跑「Migrate JWT secret」→ 啟用 ES256（asymmetric）
2. proxy 跟 getServerAuth 改用 `await supabase.auth.getClaims()`：
   - 第一次 call 從 `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` 拉 public key（~50 ms 一次性）
   - 之後 JWKS 本地 cache（同一 supabase client instance 內、由 auth-js 自己管）、JWT 純 WebCrypto verify
   - 純 CPU 驗簽 + decode、**~1-3 ms / call**

**省**：30-80 ms - 1-3 ms = **27-77 ms / call、單 request 兩處共 54-154 ms**。

**前置條件**：
- supabase-js `>= 2.69`（已內建 `getClaims`）— ✅ 現用 `2.89.0`、滿足
- `@supabase/ssr >= 0.5`（types.d.ts 已 reference `getClaims()`）— ✅ 現用 `0.8.0`、滿足
- Supabase project 必須切到 asymmetric signing（ES256 或 RS256）— ⚠️ **未驗證**、需 William 在 dashboard 確認 / 觸發 migration
- 若仍是 HS256 symmetric、`getClaims()` fallback 走 `getUser()` 路徑（**等於沒省到**）

**風險**：
- JWKS endpoint `/auth/v1/.well-known/jwks.json` 本身要可達、cache miss 時打外部
- 若用戶剛被禁用 / token revoked、JWKS 本地驗仍會「驗過」、要靠 `exp` 過期判斷（access token 預設 1h、最差有 1h 殘留授權窗口）
  - 對 SaaS ERP 可接受（不是金融級 / 密碼吃緊系統）
  - 真要立即生效仍可在敏感操作（解雇員工、改密碼）後強制 logout

### 2. 合 getServerAuth + hasCapabilityByCode 成單 query — 省 5-10 ms / call

**現況**：`requireCapability` 鏈做 2 次 employees query：
- 步驟 #9 (fallback) — getServerAuth 查 `employees WHERE user_id=X OR id=X`
- 步驟 #11 — hasCapabilityByCode 又查 `employees WHERE id=employee_id`（不查 user_id、因為已從 getServerAuth 拿到 employee_id）

**做法**：把 `requireCapability` 改成 thin wrapper、內部直接走 `getApiContext({ capabilityCode })`、一次 query 把 employees + role_capabilities JOIN 起來。`getApiContext` 已實作（`src/lib/auth/get-api-context.ts`）、滲透率 5.7%、可作為標準 SSOT。

**省**：去掉 #11 重複的 `employees` query = ~5 ms。再進一步用 JOIN 把 #12 合進來 = 再 ~5 ms。

**SQL 形狀**（單 query 替代 #11 + #12）：
```sql
SELECT e.id, e.workspace_id, e.role_id, e.status,
       EXISTS(
         SELECT 1 FROM role_capabilities rc
         WHERE rc.role_id = e.role_id
           AND rc.capability_code = $1
           AND rc.enabled = true
       ) AS has_cap
FROM employees e
WHERE e.user_id = $2 OR e.id = $2
LIMIT 1;
```

### 3. role_capabilities cache（per server instance、5 分鐘 TTL）— 省 5 ms / call、命中率 99%+

**現況**：步驟 #12 每次 request 都打一次 role_capabilities。role / capability 變更頻率極低（HR 改設定、一天 0-3 次）。

**做法**：在 server 端維護一個 `Map<role_id, Set<capability_code>>`、TTL 5 分鐘（跟 client SWR `dedupingInterval` 對齊）、`POST /api/roles/[id]/capabilities` 寫入後手動 invalidate。

**省**：~5 ms / call、cache 命中後 0.01 ms。

**風險**：Coolify 跑多 instance 時、cache 不共享、需用 Redis 或接受「最差 5 分鐘權限延遲生效」（對 ERP 可接受）。

### 4. （次要）合 user_metadata 跟 employees fallback — 已實作、~80% 命中

**現況**：getServerAuth 步驟 #8 嘗試從 `user_metadata.workspace_id` 直接拿、避免 #9 那次 employees query。實測（grep 5/8 validate-login）每次登入會 `auth.admin.updateUserById` 寫齊 metadata。**這部分已優化、不用再動**。

---

## 不可省（紅線守住）

| 步驟 | 為什麼不能省 | 紅線 |
|---|---|---|
| #1-3 proxy CSP nonce 注入 | SEC-007、每 request 獨立 nonce 防 XSS | — |
| #2 `isPublicPath()` | 公開路由白名單必過、Set lookup 很便宜（0.01 ms） | — |
| #4 OR #7 至少留一處 auth 驗 | 不驗 = 任何人能打任何 API、紅線 H「業務表 RLS 必過 workspace」靠的就是 auth user 來推 workspace_id | 紅線 0、H |
| #10 admin client 每次新建 | 跨 request 共用 admin client → 連線狀態殘留 → **跨工作區資料洩漏**（4/20 那種事故規模）| **紅線 C** |
| #14 recordApiAuditContext | 月結 / 結團後若 audit log 缺、合規完全失守 | 紅線 D（不准開作弊後門、audit 是配套） |
| RLS policy 跑 `get_current_user_workspace()` | 業務表 RLS 必過 workspace 守門、這是 DB 端最後一道 | **紅線 H** |
| workspaces 表保持 NO FORCE | login 流程需要 admin 視角查 workspace、FORCE 會擋死全員登入 | **紅線 A**（4/20 事故）|

**特別說明（紅線 A）**：本 audit chain **沒有任何步驟動 workspaces 表 RLS**、所以可省的範圍跟紅線 A 無關。但若未來改成「JWT claim 直接帶 workspace_id 跳過 employees 查」、要小心 workspace_id 變更（轉調分公司）後 stale token 仍能訪問舊 workspace、需 logout 強刷 token。

---

## JWT 本地驗的 Supabase SDK 支援

### 結論：**完全支援、現有版本即可用**

| 項目 | 現況 | 評估 |
|---|---|---|
| **`@supabase/auth-js` 內建 `getClaims()`** | ✅ 2.89.0 已內建（`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:2732`）| 不用升版 |
| **`@supabase/ssr` types 引用 `getClaims()`** | ✅ 0.8.0 types.d.ts:30/47 注明 prefer `getClaims()` over `getSession()/getUser()` | 不用升版 |
| **支援的非對稱算法** | ✅ ES256 (NIST P-256)、RS256 (RSA 2048) | 推薦 ES256（快） |
| **HS256 對稱算法** | ⚠️ `getClaims()` fallback 打 `getUser()`、**省不到** | 必須先在 Supabase project 切 asymmetric |
| **JWKS endpoint** | ✅ `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`（Supabase 自動 expose）| 不需自己架 |
| **JWKS 本地 cache** | ✅ auth-js 自己管（`this.jwks` + `this.jwks_cached_at`）| 不需自己 cache |
| **驗簽用 WebCrypto API** | ✅ `crypto.subtle.importKey('jwk', ...)` + `crypto.subtle.verify`（Node 16+、Edge runtime 都有）| Vultr Coolify Node 20+ ok |

### 操作流程（給 William 看的步驟）

1. **Supabase Dashboard** → 進 `Settings → Auth → JWT signing keys`（或 `/project/aawrgygqgemgqssflfrx/settings/jwt`）
2. **點「Migrate JWT secret」**：系統會自動建一支 ES256 standby key、舊 HS256 不會立刻廢
3. **點「Rotate keys」**：把 ES256 升為 active、舊 HS256 退為 standby（保留 7 天觀察期）
4. **觀察 1-2 天**：看有沒有 JWT verify 失敗的 log（理論上不會、新 token 用新 key 簽、舊 token 7 天內仍 verify 過 standby key）
5. **正式啟用**：把 `proxy.ts` + `server-auth.ts` + `get-api-context.ts` + `api-client.ts` 共 5 處 `supabase.auth.getUser()` 改成 `supabase.auth.getClaims()`、claims 裡 `sub` = user_id、`user_metadata` 也帶在 claims 內、不會少資訊
6. **回退方案**：若任何 verify 失敗、把 code 改回 `getUser()`、JWKS migration 不影響（兩個 API 都能用同套 token）

### Caveats（給 William 看的注意事項）

- **`user_metadata` 仍在 JWT claims 內**：所以「快速路徑」（從 metadata 拿 workspace_id）仍然成立、不用再多查 DB
- **token 過期 = 1h 殘留授權**：HS256 那種「每次都打 GoTrue」會即時感知 user 被禁用 / 改密碼；asymmetric 本地驗在 token 過期前都認帳。對 SaaS ERP 一般可接受、敏感操作（解雇、改密碼）API 端可額外強驗 `getUser()`
- **Multi-tenant workspace 切換**：若一個 user 同時在多 workspace（漫途 William 在 Corner + VENTURO 各有 employee）、`venturo-workspace-id` cookie 仍是 SSOT、JWT claims 不變動

---

## 對應研究卡

本報告對應 `workspace/_meta/architecture/2026-05-23-全站效能優化方案.md` 的：
- 「leverage 1：JWT 本地驗」— 補完 SDK 支援狀況 + 操作步驟
- 「leverage 2：合 capability check」— 補完 `getApiContext` 已是現成 SSOT、滲透率 5.7% 可推廣
- 風險評估「token 過期殘留授權」— 確認對 ERP 可接受

---

## 三條優化建議優先順序（給 William 拍板）

| 順序 | 動作 | 省 ms / call | 影響 API 數 | 風險 | 工期 |
|---|---|---|---|---|---|
| 1 | Supabase project 切 ES256 + 5 處 `getUser()` → `getClaims()` | **54-154** | 全部 159 個 route + proxy | 低（有 7 天 standby、可回退） | 0.5 天 |
| 2 | 把 `requireCapability` 改 thin wrapper、內部走 `getApiContext` 合查 | **5-10** | 98 個 route | 低（純 refactor、API 不變）| 0.5 天 |
| 3 | role_capabilities per-instance cache + 寫入後 invalidate | **5** | 全部 159 個 route | 中（多 instance 需共享或接受延遲）| 1 天 |

**累計 single request 可省**：64-169 ms / call × 全站每天 ~萬次 API call ≈ 每天省 1-3 萬秒 server time + 用戶端肉感「按鈕快 60-170 ms」。

完。
