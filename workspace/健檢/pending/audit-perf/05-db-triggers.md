# 05 — DB Trigger 全表

**資料時點**：2026-05-23 (盤查中止)
**資料來源**：production Supabase pg_catalog + pg_stat_statements、project_id `aawrgygqgemgqssflfrx`
**狀態**：⚠️ **未完成 — Supabase MCP 連不上、卡在認證**

---

## 摘要（無法產出）

無法連到 production Supabase、四個 SELECT 查詢全部失敗、沒有資料。

---

## 卡關紀錄

### 嘗試的連法

| #   | 工具                                                                                                | 結果                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `mcp__supabase__execute_sql`（project_id `aawrgygqgemgqssflfrx`、查 `information_schema.triggers`） | ❌ `Unauthorized. Please provide a valid access token to the MCP server via the --access-token flag or SUPABASE_ACCESS_TOKEN.` |
| 2   | `mcp__supabase__execute_sql`（同上、查 trigger count by table）                                     | ❌ 同樣 Unauthorized                                                                                                           |

依鐵律「第一次失敗立刻停手」、未繼續試查詢 3 / 4。

### 根因推測（未驗證）

這台機器的 Supabase MCP server 是 generic `supabase` (不是 `supabase-aierp`)、看起來啟動時沒帶 `--access-token` 也沒設 `SUPABASE_ACCESS_TOKEN` 環境變數。

brief 寫的 MCP 名稱 `mcp__supabase-aierp__*` 在這台機器不存在、只有 `mcp__supabase__*` (已用 ToolSearch 確認、tool 列表只回傳 `mcp__supabase__execute_sql` / `mcp__supabase__list_tables`)。

CLAUDE.md 提到 token 應該在 `$SUPABASE_MCP_AIERP_TOKEN`、但 generic `supabase` MCP server 看起來沒讀到。

### 建議走法（給主管 / William 拍板）

**選項 A（推薦）**：修 MCP server 設定、把 `SUPABASE_ACCESS_TOKEN` 設給 `supabase` MCP server、然後重跑這個 task。

**選項 B（備案）**：直接在 terminal 跑 psql：

```bash
source ~/.config/venturo/secrets.env
psql "$DB_URL" -f /tmp/trigger-audit.sql
```

但 CLAUDE.md 紅線寫「不准 psql 直連 port 5432」、需要 William 拍板才能走。

**選項 C（如果只想要 trigger 清單、不要 pg_stat_statements）**：
看 `supabase/migrations/*.sql` 抓 `CREATE TRIGGER`、code grep 替代。會漏掉 (1) Supabase 平台內建 trigger (2) 手動在 Studio 跑過但沒進 repo 的 trigger。

---

## Top 10 — trigger 最多的 table

（無資料）

## 全部 trigger 清單

（無資料）

## 重 trigger function 的 source 摘要

（無資料）

## 紅旗

（無資料、無法分析）

---

## 下次接手要做的事

1. 確認 `SUPABASE_ACCESS_TOKEN` 給 `supabase` MCP server
2. 重跑 brief 的 4 個查詢
3. 對照 Alex 的 `channel_messages` INSERT 10.23ms findings、找出是哪 3 個 trigger、估每個 cost
