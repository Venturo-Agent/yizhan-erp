---
date: 2026-05-12
parent-spec: 2026-05-12-channel-system-spec-v0.md
status: spec v0.2 修訂 — 待 William review、未 apply
author: Logan（執行整理）
---

# Channel spec v0.2 修訂 — 拆 HAPPY 出 employees 表

## 為什麼修

v0.1 拍板「HAPPY 走 DM、employees 表加 is_bot 旗標」、實作出來 William 直覺三個亂點：

1. 一人公司情境下、5 種 type 有 3 種空著（沒員工可 1on1、blank/project 邀誰）
2. announcement vs system_notice 業務語意分得清、但實際看就是兩個 read-only 廣播
3. **「為什麼 AI 一定要有員工」** — HAPPY 塞 employees + is_bot=true、跟舊版 BOT001 同樣偷懶

第 3 點是真正的 drift：spec §9 概念是「HAPPY 是 SaaS 內部 AI」、實作為了 sender_id FK 不改、把 HAPPY 變成假員工。

v1 HAPPY 還沒接 AI 對話能力（spec §9 Q6 拍板 v1 不做 @ mention）、所以這個假員工**目前就是空殼**。

## v0.2 修訂

### 設計選擇（5/12 二輪 William 拍板）

1. **新建獨立 `ai_agents` 表**、HAPPY 移出 employees
2. **channel_messages.sender 拆兩欄**：`sender_employee_id` + `sender_agent_id`、CHECK 約束恰一個有值（型別安全、FK 都保留）
3. **channels 表加 `agent_id`**：標記「這個 DM channel 對話對象是哪個 agent」、員工↔員工 DM agent_id IS NULL
4. **v1 不 seed HAPPY DM**：等接 AI 能力了再生、避免空殼 DM 造成 UX 困惑

### 為什麼這樣設計

- **不污染 employees**：員工統計 / 薪資 / 考勤所有 query 不用再寫 `is_bot=false` 排除
- **scope 留未來擴展**：`ai_agents.scope = 'internal'|'external'`、之後對外 AI 客服機器人（FB/IG/LINE@）直接 INSERT scope='external'、走獨立路由、不污染內部 channel
- **HAPPY 不是 channel_members**：DM channel 員工方塞 channel_members、HAPPY 方靠 channels.agent_id 標、ai_agent 永遠不進 membership 表

## 動工範圍

### DB（一支 migration、010_extract_ai_agents.sql）

```sql
-- 1. 建 ai_agents 表
CREATE TABLE ai_agents (
  id uuid PK,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,                   -- 'HAPPY' 等識別碼
  name text NOT NULL,
  avatar_url text,
  description text,
  scope text NOT NULL DEFAULT 'internal' CHECK (scope IN ('internal','external')),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at / updated_at,
  UNIQUE (workspace_id, code)
);

-- 2. 把現有 4 筆 HAPPY 從 employees 搬到 ai_agents（保留 id 一致）
INSERT INTO ai_agents (id, workspace_id, code, name, scope)
SELECT id, workspace_id, 'HAPPY', 'HAPPY', 'internal'
FROM employees WHERE is_bot = true;

-- 3. channel_messages sender 拆兩欄
ALTER TABLE channel_messages
  ADD COLUMN sender_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN sender_agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL;

-- (channel_messages 0 筆訊息、不用搬資料)

ALTER TABLE channel_messages
  DROP COLUMN sender_id,
  ADD CONSTRAINT channel_messages_sender_exactly_one CHECK (
    (sender_employee_id IS NOT NULL AND sender_agent_id IS NULL) OR
    (sender_employee_id IS NULL AND sender_agent_id IS NOT NULL) OR
    (sender_employee_id IS NULL AND sender_agent_id IS NULL)  -- 系統訊息
  );

-- 4. channels 表加 agent_id
ALTER TABLE channels
  ADD COLUMN agent_id uuid REFERENCES ai_agents(id) ON DELETE CASCADE;

-- 5. 清 employees 殘留
DELETE FROM employees WHERE is_bot = true;
DROP INDEX IF EXISTS idx_employees_is_bot;
ALTER TABLE employees DROP COLUMN is_bot;

-- employee_type CHECK 砍 'system_bot' （剩 'human'|'bot'|'integration'）
ALTER TABLE employees DROP CONSTRAINT employees_employee_type_check;
ALTER TABLE employees ADD CONSTRAINT employees_employee_type_check
  CHECK (employee_type IN ('human', 'bot', 'integration'));

-- 6. ensure_happy_dm RPC — v1 拿掉、改成「未來 v2 接 AI 後再加」
DROP FUNCTION IF EXISTS public.ensure_happy_dm();

-- 7. RLS policy 對 channel_messages 改寫（新 sender 欄位）
-- 略、見實作
```

### 應用層（6 處改動）

| # | 檔案 | 改什麼 |
|---|---|---|
| 1 | `src/types/channel.types.ts` | Message: `sender_id` → `sender_employee_id` \| `sender_agent_id`、Channel 加 `agent_id` |
| 2 | `src/data/entities/channel-messages.ts` | join sender 改 union、撈 employee 或 ai_agent |
| 3 | `src/data/entities/channels.ts` | join agent_id → ai_agents |
| 4 | `src/data/entities/ai-agents.ts` | **新增**、createEntityHook |
| 5 | `src/app/(main)/channels/_components/ChannelView.tsx` | sender_name resolve 改 union |
| 6 | `src/app/(main)/channels/_components/ChannelsSidebar.tsx` | DM 對方名字撈法：員工↔員工 join member.employee、員工↔HAPPY join channel.agent_id → ai_agents |
| 7 | `src/app/(main)/channels/_components/CreateChannelDialog.tsx` | 拔 `is_bot` 過濾、HAPPY 自然不在員工列表 |
| 8 | `src/app/(main)/channels/_components/ChannelMembersDialog.tsx` | 同上、拔 `is_bot` 過濾 |
| 9 | `src/app/(main)/channels/layout.tsx` | 拔 `ensure_happy_dm` RPC call、v1 不 seed DM |

### 不改的東西

- `channels` 5 種 type（announcement / system_notice / dm / blank / project）保留、是 spec §9 拍板項
- `channel_members` 表結構不動（只塞員工、不塞 agent）
- `workspace_features` / `role_capabilities` 不動（channels feature 已啟用）

## Apply 順序

1. William review spec v0.2 + migration 草稿
2. 跑 `tests/e2e/login-api.spec.ts`（動 RLS、要先驗）
3. apply migration
4. 同步合併應用層改動（type 改 + 9 個檔案）
5. `npm run type-check` 通過
6. UI 手動驗證：HR 員工列表沒 HAPPY、channels 還能進、announcement / system_notice 還會 render
7. William 拍板 commit

## Rollback

```sql
-- 反向
ALTER TABLE employees ADD COLUMN is_bot boolean NOT NULL DEFAULT false;
INSERT INTO employees (id, workspace_id, display_name, chinese_name, english_name, employee_number, is_bot, status, employee_type)
SELECT id, workspace_id, 'HAPPY', 'HAPPY', 'HAPPY', 'BOT-HAPPY', true, 'active', 'system_bot'
FROM ai_agents WHERE code = 'HAPPY';
ALTER TABLE channels DROP COLUMN agent_id;
ALTER TABLE channel_messages
  ADD COLUMN sender_id uuid REFERENCES employees(id),
  DROP COLUMN sender_employee_id,
  DROP COLUMN sender_agent_id;
DROP TABLE ai_agents;
-- 重建 ensure_happy_dm RPC（從 git history 拉）
```

## 對齊紅線

- ✅ 開發品管維度 #4：審計欄位 FK 不變（sender_employee_id 指 employees(id) on delete set null）
- ✅ 維度 #8 5 個 SSOT：本次不加新功能、channels 已啟用、不用改 features.ts / module-tabs.ts / capabilities.ts
- ✅ 維度 #3：動 RLS 前跑 login-api.spec.ts
- ✅ 動 Supabase 必先 William 拍板（這份 spec 就是給拍板用的）
