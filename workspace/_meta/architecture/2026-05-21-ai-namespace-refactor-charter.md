# AI Namespace Refactor — Charter

> 2026-05-21 William 拍板。三階段重構、把「AI / bot」這塊 namespace 從員工拆出來、收進 AI Hub。

---

## 拍板的事實

1. **LINE Bot 不該是 employee。** 過去因為 RBAC 是 `employee → role → capability`、bot 要寫 orders / customers / tours 得有 role_id、就被硬塞進 employees 表。結果 bot row 漏進 HR、私訊、員工列表、workspace seed（角落 Workspace）等所有 UI。
2. **HAPPY 已經住在 `ai_agents` 表、規範就是它。** LINE Bot / FB Bot 應該搬進 `ai_agents`、不另起 service_accounts 表。
3. **AI Hub 不搬家、保留 `/ai` 路由。** UI 改成跟 `/channels` 一樣的沉浸式 layout、sidebar header 加齒輪 → 滿版設定 dialog。權限只動既有 `ai_hub.read/write`、不新建 `settings.ai` capability。

---

## Phase 1：UI 殼鏡像頻道（**本 charter 寫的同時已完成、純前端**）

已落地的檔案（2026-05-21）：

| 動作 | 檔案                                                 | 變更                                                                                         |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 改   | `src/lib/constants/layout.ts`                        | `CUSTOM_LAYOUT_PAGES` 加回 `/ai`                                                             |
| 重寫 | `src/app/(main)/ai/layout.tsx`                       | 改成 `<aside AiSidebar /> + <main>{children}</main>` 沉浸式殼                                |
| 新建 | `src/app/(main)/ai/_components/AiSidebar.tsx`        | 兩 section（概覽 / AI 機器人）+ 三 icon header（新增 / 收側欄 / 設定齒輪）+ 收起狀態 icon 列 |
| 新建 | `src/app/(main)/ai/_components/AiSettingsDialog.tsx` | 滿版設定 dialog、tabs：通道設定（沿用 AiSetupTab）/ 全域 policy / 對話復盤入口               |
| 改寫 | `src/app/(main)/ai/page.tsx`                         | 拿掉 ContentPageLayout + tabs、改讀 `?view=xxx` 切內容                                       |

---

## Phase 2：每個 bot 的個別設定 dialog（**本 charter 寫的同時已完成殼、內容待填**）

| 動作 | 檔案                                                | 變更                                                                                                                                        |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 新建 | `src/app/(main)/ai/_components/BotConfigDialog.tsx` | 滿版 dialog、依 botView 顯示對應 bot 的設定。Phase 2 第一版只放殼 + 提示文案、HAPPY 標「不可修改」、LINE Bot 標「Phase 3 接 prompt 編輯器」 |
| 改   | `AiSidebar.tsx`                                     | 每個 bot row hover 顯示小齒輪、點開 BotConfigDialog                                                                                         |

**待 Phase 3 內容**：

- LINE Bot 的 prompt 編輯器、shortcut 模板列表（移現有 `PostbackTemplatesSection`）、few-shot 範例
- 接到 `ai_agents.capabilities` jsonb 上（**等 Phase 0 落地**）

---

## Phase 0：LINE Bot 從 employees → ai_agents（**未開工、destructive、要 Supabase MCP**）

### 為什麼留到最後？

- DB migration 不可逆、必須 review SQL 後用 `mcp__supabase-aierp__apply_migration` 套
- 這場 session 沒 Supabase MCP 工具（CLAUDE.md 規定唯一通道）→ 不能 apply
- Phase 1/2 的 UI 殼可以**先在 employees 模型上運作**、Phase 0 落地後資料源切換即可、UI 不必再改

### 拍板的設計

- LINE Bot 搬進 `ai_agents`（已存在的 HAPPY 表）、不另開 `service_accounts`
- `workspace_line_settings.bot_employee_id` → 改 `bot_agent_id`、FK 改 `ai_agents(id)`
- Facebook / Instagram 對應的 `workspace_facebook_settings` / `workspace_instagram_settings` 也有 `bot_employee_id`、一併改
- 砍 employees 裡 `employee_type IN ('bot', 'system_bot', 'integration')` 的 row
- 砍 `employee_type` CHECK 約束（簡化成只剩 'human'）或乾脆砍欄
- 砍「系統機器人」role（`workspace_id IS NULL` 的平台共用 role）+ 5 個 capability seed
- bot 寫業務資料時的 audit FK：擴 `created_by_agent_id uuid REFERENCES ai_agents(id)` 到 `orders / customers / tours`、nullable、跟 `created_by`（指 employees）二選一

### Migration 分步（建議分 4 個檔、不破壞性的先、destructive 的最後）

1. **`YYYYMMDDHHMMSS_add_bot_agent_id_to_workspace_integrations.sql`**
   - `ALTER TABLE workspace_line_settings ADD COLUMN bot_agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL`
   - 對 `workspace_facebook_settings` / `workspace_instagram_settings` 同樣加
   - 建索引 `idx_workspace_line_settings_bot_agent`
   - **不破壞**舊欄、雙寫過渡

2. **`YYYYMMDDHHMMSS_backfill_line_bot_into_ai_agents.sql`**
   - 對每個有 `bot_employee_id` 的 workspace_line_settings：
     - 找對應的 employees row（`employee_type='bot'`、`employee_number LIKE 'BOT-%-001'`）
     - 在 ai_agents 建對應 row：`code='line_bot'`、`name='LINE Bot'`、`scope='external'`、`status='active'`、`capabilities='{"orders":["read","write"],"customers":["read","write"],"tours":["read"]}'`
   - `UPDATE workspace_line_settings SET bot_agent_id = ai_agents.id WHERE bot_employee_id = ...`
   - FB / IG 同上

3. **`YYYYMMDDHHMMSS_extend_audit_with_agent_id.sql`**
   - `ALTER TABLE orders ADD COLUMN created_by_agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL`
   - 對 `customers / tours / channel_messages` 同樣加（如果還沒有）
   - 加 CHECK：`created_by IS NOT NULL OR created_by_agent_id IS NOT NULL`（至少一個非 NULL）

4. **`YYYYMMDDHHMMSS_drop_legacy_bot_employees.sql`** ⚠️ destructive
   - `DROP FK constraint workspace_line_settings_bot_employee_id_fkey`（同 FB / IG）
   - `DELETE FROM employees WHERE employee_type IN ('bot', 'system_bot', 'integration')`
   - `DELETE FROM workspace_roles WHERE name = '系統機器人' AND workspace_id IS NULL`
   - `DELETE FROM role_capabilities WHERE role_id IN (砍掉的系統機器人 role)`
   - `ALTER TABLE employees DROP CONSTRAINT employees_employee_type_check`
   - `ALTER TABLE employees ALTER COLUMN employee_type DROP DEFAULT`（或乾脆砍欄）
   - 重建 CHECK 成 `employee_type = 'human'`（或不再 CHECK、let it be nullable）
   - `ALTER TABLE workspace_line_settings DROP COLUMN bot_employee_id`（同 FB / IG）
   - **必附 reverse SQL 註解**

### Ripple — API / lib 改寫清單

| 檔案                                            | 改動                                                                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/line/setup-pipeline.ts`                | `provisionLineBot()` 改建 ai_agents row（line 73-114 整段重寫）、`workspace_line_settings.bot_employee_id` → `bot_agent_id` |
| `src/app/api/line/setup/provision/route.ts`     | 回傳 `botAgentId` 取代 `botEmployeeId`                                                                                      |
| `src/app/api/line/setup/status/route.ts`        | select / output 用 `bot_agent_id`                                                                                           |
| `src/app/api/line/webhook/route.ts`             | `settings.bot_employee_id` → `bot_agent_id`、handler context 改用 agent_id                                                  |
| `src/app/api/cron/line-flush/route.ts`          | 同 webhook                                                                                                                  |
| `src/lib/line/erp-bridge-internal.ts`           | audit 寫入用 `created_by_agent_id` 而非 `created_by`                                                                        |
| `src/lib/line/handler.ts`                       | 同                                                                                                                          |
| `src/app/api/facebook/setup/provision/route.ts` | FB 對應改寫                                                                                                                 |
| `src/types/line.types.ts`                       | type 註解 + 欄位名稱對齊                                                                                                    |
| `src/lib/supabase/types.ts`                     | 重新 generate（apply migration 後跑 `mcp__supabase-aierp__generate_typescript_types`）                                      |

### UI 連帶清理（Phase 0 落地後）

| 檔案                                                      | 改動                                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/app/(main)/channels/_components/ChannelsSidebar.tsx` | line 90-93 的 `employee_type !== 'bot'/'system_bot'/'integration'` filter 全部可拿掉（employees 表只剩 human） |
| `src/data/entities/employees.ts`                          | slim select 的 `employee_type` 可拿掉（不再需要）                                                              |
| 角落 Workspace / 員工列表 / HR 頁 / 私訊                  | 自動乾淨、不必各自加 filter                                                                                    |

### 風險點 / William 要拍板的事

1. **歷史 audit row 的 `created_by` 怎麼處理？**
   - (a) 保留指空（FK SET NULL on bot employee 刪除）、新寫的走 `created_by_agent_id` ← 漸進
   - (b) backfill：所有 `created_by` 指向砍掉的 bot employee 的 row、改成 `created_by = NULL, created_by_agent_id = (對應 ai_agents.id)` ← 一刀切、要寫 update script

2. **RLS policy 改寫？**
   - 若有 RLS 政策吃 `employee_type='bot'` 走特殊路徑（譬如「bot 自己寫的 audit 不被 scope 擋」），需一併改用 agent_id 路徑
   - 跑 `npm run audit:rls` 找受影響的 policy

3. **role / capability seed 怎麼處理？**
   - 「系統機器人」role 砍了之後、LINE Bot 怎麼通過 `requireCapability` 守門？
   - **設計選擇**：API route 偵測「caller 是 bot」（譬如 LINE webhook 內呼叫）→ 不走 require-capability、走 `requireBotCapability(botAgentId, capability)` 對照 `ai_agents.capabilities` jsonb
   - 需要新建 `src/lib/auth/require-bot-capability.ts`

### 套用順序（給下個 session 的 SOP）

```bash
# 1. 確認 Supabase MCP 通了
mcp__supabase-aierp__list_tables({...})

# 2. 一個一個 apply migration（先非破壞性）
mcp__supabase-aierp__apply_migration(name="add_bot_agent_id...", query=...)
mcp__supabase-aierp__apply_migration(name="backfill_line_bot...", query=...)
mcp__supabase-aierp__apply_migration(name="extend_audit_with_agent_id...", query=...)

# 3. 改 API / lib code、push、Coolify 自動部署
# 4. 驗證 LINE webhook、provision 流程跑得通
# 5. 才 apply destructive migration
mcp__supabase-aierp__apply_migration(name="drop_legacy_bot_employees...", query=...)

# 6. 重 generate types
mcp__supabase-aierp__generate_typescript_types(project_id="aawrgygqgemgqssflfrx")

# 7. 清掉 UI 殘留 filter（ChannelsSidebar / employees slim 等）
# 8. 跑 npm run audit:rls / audit:writes 全綠
# 9. push、上 production
```

### 不可做的事（紅線）

- ❌ 不准跳過 Phase 0 直接砍 employees bot row（會撞 FK / 撞 audit constraint）
- ❌ 不准在沒 backfill ai_agents 前 drop bot_employee_id 欄（會掉 binding）
- ❌ 不准 `--no-verify` skip audit:rls / audit:writes
- ❌ destructive migration 必須在非破壞性的 4 步全 apply + production 跑過幾天確認穩定後才能套（不要當天完成全 4 步）

---

## 相關記憶

- `[[project-yizhan-erp-baseline]]` — 路徑 / GitHub / Supabase 設定
- `[[project-yizhan-erp-bots-as-employees-smell]]` — Path B 拍板的脈絡
