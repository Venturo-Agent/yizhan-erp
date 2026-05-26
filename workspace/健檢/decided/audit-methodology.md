# 健檢方法論 — 「對方式」深度路由 audit — 2026-05-21

> 5/21 finance/settings 9 項清單抓出 3 個 P0 資安洞 + 6 個 quality issue。
> William 拍板：**這個方法論變成下次健檢規範**。
> 適用對象：每張 page / 每個 module 的深度 audit。

---

## 一、方法論核心

不是給「分數」、是給「**具體 9 個問題 + 證據 + 修法**」。
分數 audit（5 維度矩陣）回答「分多少」、深度 audit 回答「哪 9 件事要修」。

---

## 二、Per-route audit 範本（每張 page 必過）

### 格式

```markdown
## 🔥/⚠️/🐛/🧱 [#] [問題簡述]（[嚴重度]）

**現象**：[user-facing impact、業務白話]

**證據**：

- 檔案 `path/to/file.tsx:行號`
- 「具體 code 片段或 grep 結果」
- DB query 如果需要：`SELECT ... WHERE ...`

**期望結果（紅線怎說）**：

- [對應紅線 #、規範文字]

**現況（grep 證據）**：

- [實際 code 走法、跟期望不一致的地方]

**對方該怎麼問**：

- [一句話 challenge、幫對方對齊]

**對照參考**：

- [Good pattern]：譬如 `payment_methods` 同表用 `workspace_id` 對齊
```

### 嚴重度標籤

| 標籤           | 意義                                  | 對應動作                          |
| -------------- | ------------------------------------- | --------------------------------- |
| 🔥 P0 critical | 資安洞、跨租戶污染、user 抱怨直接相關 | 立刻修                            |
| ⚠️ P0 medium   | 紅線違反、設計缺陷、會擴大            | 24h 內修                          |
| 🐛 bug         | 功能壞、user 體感、可能誤判           | 看 Network response 找 root cause |
| 🧱 quality     | 紅線 F 違反 / 效能 / UX 不對齊規範    | 漸進清                            |

---

## 三、Per-route audit 必查 9 項（從今天 finance/settings 學到的）

每張 page 都要過下列 9 項：

### A. 資安類（3 項）

**A1. RLS 守 workspace_id**（紅線 H）

- 該 table 的 RLS using = `workspace_id = get_current_user_workspace()`？
- 還是粗略 `auth.role() = 'authenticated'`？
- INSERT policy with check = workspace_id？還是 = true？

**A2. API 走 session、不信 client**

- workspace_id 從 `getCurrentWorkspaceId()` 取？還是 `searchParams.get('workspace_id')`？
- body 帶來的 workspace_id 不能信、要用 session 覆寫

**A3. 無 SQL injection / 字串拼接**

- `.eq.${value}` 字串拼接 → 看 value 來源（session OK、client 不 OK）
- `.or(\`x.eq.${y}\`)` 同上、能用 parameterized 就用

### B. 資料一致性（2 項）

**B1. schema SSOT — 無冗餘欄位**

- 同一張表是否兩個語意相同欄位並存？（譬如 user_id + workspace_id）
- 寫一個欄位、篩另一個？

**B2. Migration 真有跑進去**

- 看 schema_migrations 紀錄 statements 是否空陣列
- 系統預設 row 該 INSERT 的有 INSERT？

### C. 抽象層（紅線 F、2 項）

**C1. 走 entity hook、不散刻 useSWR**

- page 用 useState + fetch 自己管？還是 entity hook？
- 對應紅線 F、看 ESLint baseline 有沒有 grandfather

**C2. 寫入後 cache 失效**

- 用 apiMutate？還是只 setState？
- invalidate 對的 cache key？

### D. 效能 + UX（2 項）

**D1. 多個 fetch 用 Promise.all 並行**

- 4 個獨立 fetch 不應該 await 串、用 Promise.all

**D2. 載入失敗有 toast**

- 不能 catch 後只 logger.error 靜默吃掉
- user 看到空白頁要有提示

---

## 四、自動化整合（兩層）

### 🌙 夜間 anchor 加 grep-only 檢查（零成本、紅線 H catch）

加到 `~/.local/bin/yizhan-erp-nightly-audit.sh` 資安錨 section：

```bash
# 紅線 H: 業務表用粗略 RLS（auth.role()='authenticated' 充當隔離）
WEAK_RLS=$(mcp__supabase__execute_sql ... "
  SELECT c.relname
  FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid
  WHERE pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%auth.role()%authenticated%'
    AND c.relkind = 'r'
    AND c.relname NOT IN (
      'ref_banks','ref_countries','ref_airports','ref_destinations',
      'ref_airlines','ref_booking_classes','ref_ssr_codes','ref_status_codes',
      'ref_insurance_salary_grades',
      'kb_cruise_lines','kb_cruise_ships','kb_cabin_types','kb_sailings',
      'kb_pricing','kb_fees','kb_cancellation_policies','kb_agencies'
    )
")
if [ -n "$WEAK_RLS" ]; then
  echo "❌ 紅線 H 違反: 業務表用粗略 RLS"
  echo "$WEAK_RLS"
fi
```

### 🗓 週日 matrix 加深度 audit（只跑改動 module）

在 `~/.local/bin/yizhan-erp-weekly-matrix.sh` 智能 diff 後加：

- 對 changed modules 做「per-route 9 項深度 audit」
- 派 openclaw、用本文件當 spec
- 產出 `~/Desktop/yizhan-erp-weekly-deep-audit-{date}.md`

---

## 五、Per-route audit Charter 範本（給 openclaw 派工書）

```markdown
# Per-Route Deep Audit Charter — {date}

範圍：[which routes]

對每個 route、按 audit-methodology.md 第 3 章 9 項查、產出格式對齊第 2 章範本。

紅線：

- ❌ 不准動 code / migration / push
- ✅ MCP SELECT-only OK
- ✅ 每 route 產 5-10 條清單、不少
- ✅ 證據要具體（file:line / DB query）
- ✅ 對照參考要明確（哪張表 / 哪個 page 是好範本）

預估：每 route ~3-5 分鐘、~67 routes × 4min = 4-5 小時。
```

---

## 六、本方法論的歷史

| 日期       | 事件                                                                  |
| ---------- | --------------------------------------------------------------------- |
| 2026-05-21 | 對方（另一 AI session）首次用此方法掃 finance/settings、找出 9 項問題 |
| 2026-05-21 | William 拍板：方法論變健檢規範                                        |
| 2026-05-21 | Claude Opus 修完 6 項、剩 3 項追蹤                                    |
| 2026-05-21 | 派 openclaw 全盤路由掃描（首次跑）                                    |
| 未來       | 每週日 matrix 跑深度 audit、catch grandfather 漏網                    |

---

_建立：2026-05-21 by Claude Opus_
_基礎：finance/settings 9 項清單（對方產的）+ William 拍板_
