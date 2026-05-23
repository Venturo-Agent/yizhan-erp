# 全站效能大盤查 — 接手 Brief（給另一台電腦用）

> 寫於 2026-05-23、Alex（AI session）整理。
> 接手者讀完此檔可直接動手、不需再問澄清。

---

## 1. 背景（為什麼盤查）

VENTURO 漫途的 yizhan-erp（SaaS 多租戶 ERP）2026-05-23 凌晨被老闆 William 抱怨「頻道訊息傳送很慢、會顯示傳送中」。

Alex 量化後發現 **不是 channels 專有問題、是全站 108 個 API route 共通的效能病**：
- 每個 API 內串 5-6 次 sequential DB call + 1 次外部 Auth 驗證
- 用戶感覺慢的不只 channels、是整網站所有按鈕 / 切頁 / 儲存

William 拍板：先做**全站效能大盤查**、找出所有熱點、再依優先級開刀（不是只動 channels）。

---

## 2. 已知量化（pg_stat_statements 真實數據）

單次 `/api/channels/messages` POST 拆解：

| 步驟 | 平均 ms | 性質 |
|---|---|---|
| `supabase.auth.getUser()` 打 GoTrue | 30-80 | 外部 HTTP |
| `hasCapabilityByCode` 查 employees.role_id | ~5 | DB SQL |
| `hasCapabilityByCode` 查 role_capabilities | ~5 | DB SQL |
| memberCheck SELECT | 4.85 | DB SQL |
| recordApiAuditContext RPC | 2.52 | DB SQL |
| INSERT channel_messages + 3 triggers | 10.23 | DB SQL |
| Coolify handler runtime | 10-30 | server |
| 用戶 ↔ Vultr Tokyo RTT | 50-150 | 網路 |
| **總計** | **120-300 ms** | |

全站 leverage：
- `requireCapability` 守 **108 個 API route**
- `getServerAuth` 被 **56 個地方** call
- 散刻 `useSWR`（紅線 F 該移走）**25 個地方**

---

## 3. 既有研究卡（接手前必讀）

**先讀**：`workspace/_meta/architecture/2026-05-23-全站效能優化方案.md`

裡面已寫「三個 leverage 最大改造」（JWT 本地驗 / 合 capability check / 拿掉「傳送中」UI）+ 風險評估 + 預期效益。

大盤查的任務是**驗證 + 擴大**這份研究、不是重寫。

---

## 4. 大盤查任務拆解（派 N 個 subagent 並行）

派 7 個 general-purpose subagent 並行跑、每個負責一塊。產出：每份報告**不動 production code、純調查 + 量化**。

### 任務 1：API route 響應時間矩陣

**範圍**：`src/app/api/**/*.ts` 全部 108 個 API route

**要求**：
- 列每個 API 內 sequential DB call 數量
- 標用 `requireCapability` / `getServerAuth` / `recordApiAuditContext` 的有哪些
- 估每個 API 的「DB round trip 數」
- 找「最肥」top 20（譬如串接 > 5 次 sequential DB call）

**工具**：`grep -rn` + Read

**產出**：`workspace/健檢/pending/audit-perf/01-api-routes-matrix.md`

---

### 任務 2：SSR / Server Action 熱點

**範圍**：`src/app/(main)/**/page.tsx` + `src/app/**/actions.ts`

**要求**：
- 列每頁 SSR 階段查多少 DB
- 找「重複 query」（同頁不同 component 各自查同表）
- 找「N+1 pattern」（loop 內 await DB call）

**工具**：grep + Read

**產出**：`workspace/健檢/pending/audit-perf/02-ssr-hotspots.md`

---

### 任務 3：DB query 熱點全表

**範圍**：production Supabase `pg_stat_statements`

**要求**：
- top 50 by `mean_exec_time`（最慢平均）
- top 50 by `total_exec_time`（總時間殺手）
- top 50 by `calls`（最常被打）
- 分類：DDL / migration / runtime / RPC / RLS function

**工具**：`mcp__supabase-aierp__execute_sql`（project_id `aawrgygqgemgqssflfrx`）

**產出**：`workspace/健檢/pending/audit-perf/03-db-query-hotspots.md`

---

### 任務 4：auth chain 全貌

**範圍**：`src/lib/auth/**` + `src/middleware.ts` + middleware

**要求**：
- 畫完整 flow：cookie → JWT → server_auth → capability check
- 列每一步 cost（DB call / 外部 HTTP / CPU）
- 列哪些可省、哪些不能省（對照地方法律紅線 A/C/H）
- JWT 本地驗的 Supabase SSR SDK 支援狀況（有沒有 `getClaims`）

**工具**：grep + Read + WebFetch（看 Supabase docs）

**產出**：`workspace/健檢/pending/audit-perf/04-auth-chain.md`

---

### 任務 5：DB trigger 全表

**範圍**：`pg_trigger` 全表 + 對應 trigger function

**要求**：
- 列每張 table 上的 trigger（已知 channel_messages 有 3 個、其他未查）
- 標 BEFORE / AFTER × INSERT / UPDATE / DELETE
- 估每個 trigger 平均 cost（從 pg_stat_statements 對應 function）

**工具**：`mcp__supabase-aierp__execute_sql`

**產出**：`workspace/健檢/pending/audit-perf/05-db-triggers.md`

---

### 任務 6：Client 端讀取效能

**範圍**：`src/data/entities/*.ts` + `src/lib/swr/**`

**要求**：
- 列每個 entity hook 的 cache TTL / dedupe / realtime 設定
- 找散刻 `useSWR` 沒走 entity hook 的（紅線 F、25 個地方）
- 找散刻 `mutate(key)` 沒走 `apiMutate` 的

**工具**：grep + Read

**產出**：`workspace/健檢/pending/audit-perf/06-client-fetching.md`

---

### 任務 7：Bundle / Cold start / 第三方 SDK

**範圍**：`next.config.*` + `package.json` + `src/**` 動態 import

**要求**：
- 大型 library（> 100KB、jsPDF / xlsx / chart 等）有沒有走動態 import
- 找 page 預設 server component 但其實該 client（無謂 SSR cost）
- Sentry / 第三方 SDK 的 sample rate 配置
- 看 Coolify / Vultr cold start log 樣本

**工具**：grep + Read

**產出**：`workspace/健檢/pending/audit-perf/07-bundle-coldstart.md`

---

### 任務 8（最後）：整合 + 優先級排序

把 1-7 報告整合成「全站效能優化執行排序」、附 ROI 估算（修一條省多少 ms × 影響面）。

**產出**：`workspace/健檢/pending/audit-perf/00-executive-summary.md`

---

## 5. 紀律 / 紅線（必守）

**MUST DO**：
- ✅ 純調查、純報告、**不動任何 production code / DB / RLS / migration**
- ✅ 純走 read-only：grep / Read / `execute_sql SELECT`、不准 INSERT / UPDATE / DELETE / DDL
- ✅ 跑 SQL 用 `mcp__supabase-aierp__execute_sql`、project_id `aawrgygqgemgqssflfrx`
- ✅ 每份報告開頭寫「資料時點：2026-05-23 XX:XX」+「資料來源：grep / Read / pg_stat_statements」
- ✅ 量化（數字）、不寫感想

**MUST NOT**：
- ❌ 不修 code（一行也不准、發現問題只能寫進報告）
- ❌ 不 INSERT / UPDATE / DELETE / DROP / CREATE 任何 DB
- ❌ 不 commit / push
- ❌ 不 mock / fake data
- ❌ 不跳 `mcp__supabase-aierp__*`、走別的 Supabase 連線

---

## 6. 地方法律（連線方式）

| 場景 | 工具 |
|---|---|
| 跑 SQL（read-only）| `mcp__supabase-aierp__execute_sql` / project_id `aawrgygqgemgqssflfrx` |
| 列 table | `mcp__supabase-aierp__list_tables` |
| 看 log | `mcp__supabase-aierp__get_logs` |
| grep code | Bash `grep -rn`（不靠 GitNexus、索引 stale）|
| 讀 file | Read |

Secrets 位置（不寫值、只寫變數名）：`~/.config/venturo/secrets.env`

---

## 7. 卡住怎辦

第一次連不上 / 找不到 → **立刻停手、寫進報告、不准瞎試 A → B → C 燒 token**。

譬喻：探員找不到地址、回報「找不到、需要 X 資訊」、不是亂跑燒油。

---

## 8. 交付（完成後回報）

8 份報告（7 份子任務 + 1 份整合）全部放 `workspace/健檢/pending/audit-perf/`、每份 markdown 含：
- 資料時點 + 來源
- 量化證據（數字、不是感想）
- 分類 / 排序
- 對應研究卡 A 的哪一節

完成後對 William 講：

> 「全站效能大盤查 8 份報告寫好、放 `workspace/健檢/pending/audit-perf/`、整合 summary 在 `00-executive-summary.md`、請拍板開哪幾條。」

---

## 9. 一句話總結

**不動 code、不動 DB、純讀純量、寫 8 份報告**。

