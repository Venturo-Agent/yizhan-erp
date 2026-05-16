---
date: 2026-05-14
author: Logan + William（Telegram 拍板）
status: pending、上線前必做
priority: 中（上線前必須、不影響開發中功能）
related: 2026-05-14-資料隱私三層保護-上線前待辦.md
---

# 新租戶 Onboarding Seed SOP

## TL;DR

新客戶開 workspace 時、自動 seed 一套預設資料、讓客戶**5 分鐘內能登入用**、不用先設定 5 個基礎表。

## 自動 seed 內容（William 2026-05-14 拍板）

### 1. 職務 (roles)

| Role | Capability | 預設 seed |
|---|---|---|
| 系統管理員 | 全部 | 給老闆 |
| 業務 | tours.as_sales | 預設職務 |
| 助理 | tours.as_assistant | 預設職務 |
| 會計 | finance.* | 預設職務 |

老闆之後自己加 / 改職務。

### 2. 國家 / 機場代號

**不 seed**、走 shared_data：
- 漫途維護共享池（已存在）
- 客戶啟用 `shared_data_codes` feature 就看得到
- **客戶不能自己加**（要寫去找漫途、單向供應）

### 3. 品牌管理 (brands)

- 自動建第一個品牌
- `name` = workspace.name（公司名）
- 客戶之後自己加品牌

### 4. 分公司 (branches)

- 自動建第一個 branch = 「公司本身」
- `name` = workspace.name（公司名）
- `code` = workspace.code（William 認為「沒意義」、可拿掉欄位）
- `is_default` = true
- `type` = 'headquarters'（**未來 schema 加 type 欄位**、跨 workspace 系統識別用）

### 5. 部門 (departments)

- 自動建第一個 department = 「總部」
- `name` = '總部'
- `type` = 'headquarters'（**未來 schema 加 type 欄位**）

⚠️ William 拍板：「部門管理沒有什麼預設主要次要這些啦、這功能移除」
→ 砍掉 UI 上的「主要 / 次要 / is_default 切換」（具體哪頁要 William 確認 A/B/C）

### 6. 員工 (employees)

- 系統建立時自動建第一個員工 = 老闆本人
- `role_id` = 系統管理員
- `branch_id` = 第一個 branch
- `department_id` = 第一個 department
- `email` = 老闆註冊時的 email

---

## ⚠️ Schema 變動需求

### A. branches / departments 加 type 欄位

```sql
ALTER TABLE branches ADD COLUMN type TEXT NOT NULL DEFAULT 'custom'
  CHECK (type IN ('headquarters', 'branch', 'custom'));
ALTER TABLE departments ADD COLUMN type TEXT NOT NULL DEFAULT 'custom'
  CHECK (type IN ('headquarters', 'department', 'custom'));
```

業務用意：
- name = 客戶顯示（可改、A 客戶叫「總部」、B 客戶叫「Main HQ」）
- type = 系統識別（固定 enum、跨 workspace 一致）

未來能：
- 「列出所有客戶的『headquarters』」（不管名字叫什麼）
- 跨分公司統計 / 公用 / 全線邏輯

### B. branches.code 欄位（William 認為沒意義）

待釐清：
- 砍掉？
- 還是改用 type 取代 code 的功能？

### C. is_default 欄位

William 訊息：「部門管理沒有什麼預設主要次要這些啦、這功能移除」

待釐清：
- 砍掉 DB 欄位？
- 還是只砍 UI、保留 DB（is_default 之後可能還用）

---

## 實作 SOP

### 觸發點

新 workspace 建立時、跑 onboarding seed trigger：
- Migration 加 `trigger_on_workspace_insert`
- 或寫進 Supabase Edge Function

### Seed Migration（範本）

```sql
CREATE OR REPLACE FUNCTION public.seed_new_workspace(p_workspace_id UUID, p_workspace_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Seed roles（系統管理員 + 業務 + 助理 + 會計）
  INSERT INTO workspace_roles (workspace_id, name, ...) VALUES
    (p_workspace_id, '系統管理員', ...),
    (p_workspace_id, '業務', ...),
    (p_workspace_id, '助理', ...),
    (p_workspace_id, '會計', ...);

  -- 2. Seed branches
  INSERT INTO branches (workspace_id, name, type, is_default) VALUES
    (p_workspace_id, p_workspace_name, 'headquarters', true);

  -- 3. Seed departments
  INSERT INTO departments (workspace_id, name, type, is_default) VALUES
    (p_workspace_id, '總部', 'headquarters', true);

  -- 4. Seed brands
  INSERT INTO brands (workspace_id, name) VALUES
    (p_workspace_id, p_workspace_name);

  -- 5. Seed default capabilities for roles
  -- ... 對應 role + capability matrix
END;
$$;

CREATE TRIGGER trg_workspace_onboarding
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION seed_new_workspace(NEW.id, NEW.name);
```

---

## 工程量

| 範圍 | Time |
|---|---|
| Migration: branches/departments 加 type 欄位 | 10 min |
| Migration: seed_new_workspace function + trigger | 30 min |
| 處理現有 workspaces 的 backfill（type='headquarters' 給現有 first row）| 15 min |
| Workspace 創建頁 UI（漫途 admin 建客戶）銜接 | 30 min |
| 砍 is_default UI / 評估 schema 影響 | 30 min |
| E2E 測試（建測試 workspace 看 seed 是否齊）| 30 min |
| **Total** | **~2-3 hr** |

---

## 紀錄

- 2026-05-14 William telegram 拍板 onboarding seed 內容（messages 1098-1106）
- 國家 / 機場代號明確走 shared_data、不 seed
- 預設職務 3 個：業務 / 助理 / 會計（系統管理員獨立給老闆）
- 部門「主次 / is_default」UI 砍掉（具體哪頁待釐清）
- branches.code 可能砍（待釐清）
- type 欄位（branches / departments）**新增**、給未來公用邏輯
