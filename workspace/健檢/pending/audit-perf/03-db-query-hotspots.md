# 03 — DB Query 熱點全表

**資料時點**：2026-05-23（未取得、卡關中）
**資料來源**：production Supabase `pg_stat_statements`、project_id `aawrgygqgemgqssflfrx`
**狀態**：**未完成 — Supabase MCP access token 失效、無法連 DB、需 William 介入更新 token 後重跑**

---

## 卡關報告（給 William）

**白話**：Supabase 的「萬能鑰匙」（access token）過期了、Claude 連不進 production DB、所以這份報告完全跑不起來。

### 證據鏈

1. **報錯訊息**：MCP `mcp__supabase__execute_sql` 第一次呼叫直接吐

   ```
   Unauthorized. Please provide a valid access token to the MCP server
   via the --access-token flag or SUPABASE_ACCESS_TOKEN.
   ```

2. **根因**：兩個地方的 token 不一致
   | 來源 | token 前綴 | 狀態 |
   |---|---|---|
   | `/Users/william/Projects/yizhan-erp/.mcp.json`（MCP server 啟動參數寫死）| `sbp_94746ae5...` | **MCP 拿這把跑、Supabase 回 401** |
   | `~/.config/venturo/secrets.env` 的 `SUPABASE_MCP_AIERP_TOKEN` | `sbp_fe9ad0...` | 看起來新的、但 MCP 沒讀到 |

3. **MCP server 配置位置**：`/Users/william/Projects/yizhan-erp/.mcp.json` 第 13 行硬編碼了舊 token、沒 reference env var。

### 建議下一步（William 拍板擇一）

**選項 A（推薦、最快）**：把 `.mcp.json` 第 13 行的 token 換成 `secrets.env` 裡的 `SUPABASE_MCP_AIERP_TOKEN` 值、重啟 Claude session、Task 3 重跑

**選項 B**：去 Supabase Dashboard → Account → Access Tokens 重產一把新的、同步更新 `.mcp.json` + `secrets.env` 兩個地方

**選項 C**（緊急、繞過 MCP）：William 自己用 Supabase Studio SQL Editor 跑 3 條查詢、把結果貼回給 Claude 分類整理

### 為什麼不瞎試其他連法

地方法律明白寫：

- ❌ 不准 SSH Vultr / psql 直連 port 5432
- ❌ 不准 supabase CLI
- ❌ 第一次連法失敗 → 立刻停手 → 報告、不准 A→B→C→D 瞎試燒 token

雖然 `secrets.env` 有 `SUPABASE_DB_URL` 可以直接 psql 連 DB、但這條路被紅線擋、不准走。

---

## 預計跑的查詢（token 修好後一鍵 copy）

### 查詢 0：先驗 extension 跟 reset 時間

```sql
-- extension 是否啟用
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_stat_statements';

-- 樣本期間
SELECT * FROM pg_stat_statements_info;
```

### 查詢 1：top 50 by mean_exec_time（最慢平均）

```sql
SELECT
  LEFT(query, 200) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'
ORDER BY mean_exec_time DESC
LIMIT 50;
```

### 查詢 2：top 50 by total_exec_time（總時間殺手）

```sql
SELECT
  LEFT(query, 200) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'
ORDER BY total_exec_time DESC
LIMIT 50;
```

### 查詢 3：top 50 by calls（最常被打）

```sql
SELECT
  LEFT(query, 200) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'
ORDER BY calls DESC
LIMIT 50;
```

---

## 摘要

（待重跑後填）

## Top 50 by mean_exec_time（最慢平均）

（待重跑後填）

## Top 50 by total_exec_time（總時間殺手）

（待重跑後填）

## Top 50 by calls（最常被打）

（待重跑後填）

## 跨表交叉觀察

（待重跑後填）

## 紅旗

（待重跑後填）
