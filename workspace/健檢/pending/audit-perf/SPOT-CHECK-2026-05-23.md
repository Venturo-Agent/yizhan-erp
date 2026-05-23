# Spot Check — 4 份子任務報告品管

> 2026-05-23 主管視角複查、針對 4 份 Claude subagent 回來的報告做 spot check、抓 hallucination。
> 範圍：Task 1（API matrix）/ Task 2（SSR）/ Task 4（auth）/ Task 6（client）/ Task 7（bundle）。
> 方法：每份報告抽 2-3 個關鍵 claim、grep + Read 真實檔案驗證。

---

## ✅ 確實成立（可直接信、可採用）

| 來源 | Claim | 驗證 | 結果 |
|---|---|---|---|
| Task 7 | `pdf-lib`（24MB）是殭屍依賴、code 內 0 import | `grep -rn "from 'pdf-lib'" src` → 0 hit | **TRUE** — 可砍 |
| Task 7 | Sentry client `replaysSessionSampleRate: 0.1`、`replaysOnErrorSampleRate: 1.0` | 真 `sentry.client.config.ts` line 16, 20 | **TRUE** — 配額洩血是真的 |
| Task 7 | production `tracesSampleRate: 0.05`（5%） | line 11 | **TRUE** |
| Task 4 | `@supabase/auth-js` 已內建 `getClaims()`（無需升版） | `node_modules/.../GoTrueClient.js:2732` | **TRUE** — JWT 本地驗的前置條件成立 |
| Task 4 | `auth.getUser()` 在 lib/auth 多處重複 call | grep 找到 5 個 callsite（server-auth.ts 2 次 / get-layout-context.ts / get-api-context.ts / supabase/api-client.ts） | **TRUE** — 確有重複 |
| Task 4 | `getApiContext` 只 5.7% route 採用（9/159） | `grep -rl 'getApiContext' src/app/api` → 9 | **TRUE** |
| Task 2 | yizhan-erp 67 個 page.tsx 沒 SSR data fetch、0 個 actions.ts | `find` + grep | **TRUE** — 整盤 fetching 全推給 client、跟「全站慢」相符 |

---

## ❌ Hallucination / 不成立（不可採用、要在 summary 修正）

### 1. Task 7 — jspdf-autotable 是殭屍 ❌

- **Agent 講**：`jspdf-autotable`（244KB）是殭屍、可直接 uninstall
- **真實**：`src/lib/pdf/disbursement-pdf.ts:182` 有 `const { default: autoTable } = await import('jspdf-autotable')` 在跑、line 299 註解也明確說「jspdf-autotable extends doc」
- **判定**：**用中、不可砍**。Agent grep 漏看 dynamic import 寫法。
- **修正**：pdf-lib（24MB）可砍是真的、jspdf-autotable 不可砍。

### 3. Task 6 — 「散刻 useSWR 37 處」inflated ❌

- **Agent 講**：37 處散刻 useSWR、紅線 F 嚴重偏離
- **真實**：`grep -rE "(^|[^a-zA-Z])useSWR\("` 排除 useSWRConfig → **8 處**（不是 37）
- **可能解釋**：Agent 算進 `useSWRConfig` / `useSWRInfinite` 等變體、但那些不是「散刻資料抓取」、是 mutate getter
- **判定**：「散刻多處」方向對、實際只 8 處（仍違紅線 F、但量級不像 37 那麼驚悚）

### 4. Task 6 — 提到的具體檔名半假 ❌

- **Agent 講**：`useTourItineraryItems.ts` / `useToursPaginated.ts` 散刻 supabase.from / channel
- **真實**：
  - entity 檔是 kebab-case `tour-itinerary-items.ts`、不是 camelCase。grep 該檔 0 supabase 引用、**Agent 講錯檔**
  - `useToursPaginated.ts` 確有 file（在 `_hooks/`、不在 entities）、要驗有無散刻 channel 需單獨讀檔
- **判定**：「entity bypass」這個 pattern 可能存在、但 Agent 列的具體檔案不可信、要重抓

### 2. Task 2 — `createEntityHook.useList` filter 被 silently drop ❌

- **Agent 講**：「filter 參數**被 silently drop**（comment 自承）」→ 推論 `/tours/[code]` 5 個 component 全 workspace 撈 receipts、egress 殺手。
- **真實**：
  - `createEntityHook.useList` 在 limit 路徑（line 222-228）跟 paginated 路徑（line 262-269）**都把 filter 套進 `.eq()`**、明確 work。
  - Agent 信的「comment 自承」在 `tour-receipts.tsx:65`：「注意：useReceipts({ filter }) 的 filter 參數目前被 createEntityHook.useList silently drop」— 但 createEntityHook 實作早就修了、**這條 comment 是 stale 殘留**、Agent 沒驗實作就信 caller 的舊 comment。
- **判定**：**egress 殺手 claim 不成立**。filter 有套、5 個 component 每個只撈該團的 receipts、不是全 workspace。
- **真實效能問題仍存在**：5 個 component 各跑 1 次同 filter 的 query、SWR cache 命中後第 2-5 次免費、第一次 mount 仍 5 次 round-trip。但跟「全 workspace 撈」差很遠。
- **副產出**：發現 `tour-receipts.tsx:65` 的 stale comment 該清掉（污染源、誤導 Agent + 未來工程師）。

---

## ⚠️ 數字可能有偏差（方向對、量級待驗）

### Task 1 — top 5 最肥 route 的 DB call 數

- **Agent 講**：`/line/webhook` 18 call、`period-closing POST` 14 call、`receipts refund POST` 11 call
- **我 naive grep**：3 / 7 / 3（只 grep route.ts 一層）
- **真相**：差距來自「是否追進 helper」。`/line/webhook` import 了 7 個 helper（`processIncomingTextMessage` / `recordInboxMessage` / `downloadAndStoreLineMedia` 等）、helper 內各自 DB call。Agent 若追進 call graph、18 是合理估算；我若只看 route.ts 表面、3 是低估。
- **判定**：**ranking 應該對、絕對數字可能不精確**。要精確需 instrument 跑真實 request 看實際 DB call 次數（pg_stat_statements 配 request trace）— 那是 Task 3 該做的（卡 MCP）。
- **不影響結論**：「全站每個按鈕都串 5-10 次 DB call、且重複 auth + capability check」這個方向絕對成立。

### Task 1 — route 總數 151 vs 我數的 159

- **Agent 講**：151
- **我數**：`find src/app/api -name 'route.ts' | wc -l` → 159
- **差距**：8 個（5%）。可能是 Agent 排除了 `/api/health`、`/api/cron` 等技術 route。不影響結論。

---

## 收工複盤（清污染源）

1. **`src/app/(main)/tours/_components/tour-receipts.tsx:65`** 的 stale comment「filter 被 silently drop」要清掉、害下次 audit 又被誤導。**待 William 拍板後一併修**。
2. 本 spot-check 列入 audit-perf 資料夾、不單獨 commit、跟整批一起。

---

## 寫進品管 summary 的紅旗（給 William 看的）

1. **pdf-lib 24MB 殭屍可砍** — 真的（Task 7 此 claim 對）
2. **Sentry Replay 配額洩血** — 真的、`replaysSessionSampleRate: 0.1` 確認（Task 7 對）
3. **JWT 本地驗可省 30-80ms/call × 全站每個按鈕** — SDK 已支援、真的可動（Task 4 對）
4. **auth chain 重複** — `getServerAuth` + `requireCapability` 對 employees 表查 2-3 次、可合併成 1 次（Task 4 對）
5. **getApiContext 已寫好但只 5.7% 採用** — 修法 = 把舊 chain 全改吃 `getApiContext`、低風險（Task 4 對）

**不寫進 summary（hallucination 已剔除）**：
- jspdf-autotable 殭屍 — 假的、不寫
- `/tours/[code]` egress 殺手 — 假的、改寫成「5 個 component 各撈 1 次同 filter、第一次 mount 5 次 round-trip」
