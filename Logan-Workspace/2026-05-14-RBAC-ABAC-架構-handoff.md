---
date: 2026-05-14
author: Logan + William（Telegram messages 1115-1142 拍板）
status: 3/7 step 完成、4 step pending 下次 session
priority: 上線前必做、是核心權限架構
related: 2026-05-14-新租戶-onboarding-seed-SOP.md / 2026-05-14-資料隱私三層保護-上線前待辦.md
---

# RBAC + ABAC 架構大改 — Handoff 卡

## TL;DR

William 拍板「治本設計」3 層架構：
- **Role**：控讀寫 scope（看誰 / 改誰）
- **Cross-access**（員工層）：能讀哪些 branch / department（multi-select）
- **Eligibility**（員工層）：能扮演什麼身份（業務 / 助理 / 團控 / 代墊）

3 層**完全解耦**、預設嚴格（寫只能寫自己）、客戶 HR 自己調寬鬆。

---

## 進度（本 session 已完成 3/7）

### ✅ A. seed 6 role（commit 8c9e2e3）
- 系統管理員 / 部門主管 / 業務主管 / 業務 / 會計 / 助理
- seed_new_workspace function 已 CREATE OR REPLACE
- 既有 4 workspaces 已 backfill 部門主管 + 業務主管

### ✅ B. role_capabilities 加 can_write_others（commit 8c9e2e3）
- boolean、預設 false（嚴格只寫自己）
- 主管 role HR 自己開啟、可跨人改

### ✅ C. employees 加 cross-access 欄位（commit 8c9e2e3）
- `accessible_branch_ids uuid[]` 預設空
- `accessible_department_ids uuid[]` 預設空
- 空 = fallback employee.branch_id / department_id
- 有值 = 嚴格按清單

### ✅ D. 砍 is_dept_manager flag UI（本 session 改、待 commit）
- EmployeeForm 內 is_dept_manager checkbox 砍除
- DB 欄位先保留（之後 polish migration 砍）
- grid-cols-3 → grid-cols-2

---

## ⚠️ 待做 4/7（下次 Logan session 接手）

### E. EmployeeForm 加 cross-access multi-select（1.5 hr）

**位置**：`src/app/(main)/hr/_components/EmployeeForm.tsx`
**插入點**：分公司 / 部門 dropdown 之後、Eligibility section 之前

**UI**：
```jsx
<div className="space-y-1.5">
  <Label>可讀取分公司</Label>
  <div className="grid grid-cols-3 gap-2">
    {branches.map(b => {
      const checked = formData.accessible_branch_ids.includes(b.id)
      return (
        <label key={b.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => toggleAccessibleBranch(b.id, e.target.checked)}
          />
          <span>{b.name}</span>
        </label>
      )
    })}
  </div>
  <p className="text-[10px] text-morandi-muted">
    勾選 = 此員工除了自己 branch 還可額外讀取的分公司。預設帶員工自己 branch。
  </p>
</div>

{/* 同樣寫 accessible_department_ids multi-select */}
```

**formData 加**：
```ts
accessible_branch_ids: string[],
accessible_department_ids: string[],
```

**初始化**：
```ts
accessible_branch_ids: employee?.accessible_branch_ids
  || (formData.branch_id ? [formData.branch_id] : []),
accessible_department_ids: employee?.accessible_department_ids
  || (formData.department_id ? [formData.department_id] : []),
```

**儲存（POST/PUT body 加）**：
```ts
{
  ...
  accessible_branch_ids: formData.accessible_branch_ids,
  accessible_department_ids: formData.accessible_department_ids,
}
```

### F. Dropdown caller 對齊 employee_eligibilities（45 min、retro Task #42）

**檢查**：`src/data/hooks/useEligibleEmployees.ts` 目前 query 的是 `role_capabilities` 還是 `employee_eligibilities`？

如果還是 role_capabilities → 改成 employee_eligibilities：

```ts
// 改前
const { data: caps } = await supabase
  .from('role_capabilities')
  .select('role_id')
  .eq('capability_code', `${moduleCode}.${tabCode}.write`)
  .eq('enabled', true)
// ... 從 caps 推 role_ids 再撈 employees

// 改後
const eligibilityCode = `${moduleCode}.${tabCode}`
const { data: rows } = await supabase
  .from('employee_eligibilities')
  .select('employee_id, employees(id, employee_number, chinese_name, ...)')
  .eq('eligibility_code', eligibilityCode)
  .eq('employees.workspace_id', workspaceId)
  .eq('employees.status', 'active')
```

**驗證**：訂單 / 請款 dropdown「業務 / 助理」清單跟員工 eligibilities 對齊。

### G. RLS policies 改吃 cross-access（1.5-2 hr、最複雜、最後做）

**範圍**：所有 workspace-scoped tables 的 SELECT/UPDATE/DELETE policy

**核心邏輯**：
```sql
-- 改前（典型）：workspace_id = get_current_user_workspace()
-- 改後：

CREATE OR REPLACE FUNCTION public.row_visible_to_current_user(
  p_row_workspace_id UUID,
  p_row_owner_branch_id UUID,
  p_row_owner_department_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.workspace_id = p_row_workspace_id
      AND (
        -- 1. 員工的 accessible_branch 預設帶自己 branch
        p_row_owner_branch_id IS NULL
        OR p_row_owner_branch_id = e.branch_id
        OR p_row_owner_branch_id = ANY(e.accessible_branch_ids)
      )
      AND (
        p_row_owner_department_id IS NULL
        OR p_row_owner_department_id = e.department_id
        OR p_row_owner_department_id = ANY(e.accessible_department_ids)
      )
  );
$$;

-- 改 policy 譬如 orders_select：
DROP POLICY IF EXISTS orders_select ON orders;
CREATE POLICY orders_select ON orders FOR SELECT TO authenticated
  USING (
    public.row_visible_to_current_user(workspace_id, owner_branch_id, owner_department_id)
  );
```

⚠️ **要做**：
1. 每張 workspace-scoped 表加 `owner_branch_id` / `owner_department_id` 欄位（從 employee 表帶來）
2. 或者：靠 `created_by` 員工 ID join 員工的 branch / department
3. RLS policy 全 review、改新邏輯
4. Backfill 既有 row 的 owner_branch / owner_department

範圍很大、應該獨立 migration + spike。

---

## 🤖 給接手 session 的指引

1. 讀本卡（看 William 拍板的 3 層架構）
2. 讀 schema：`role_capabilities.can_write_others` / `employees.accessible_*` 確認還在
3. 看 EmployeeForm 內已加的 Eligibility section（學該模式）
4. 動 E：照 Eligibility section 的模式加 cross-access section
5. 動 F：grep useEligibleEmployees + 動 query
6. 動 G：最後做、要 spike、不要急著一次寫完

每完成一條 commit + push、不要 1 commit 多事。
完成後跟 William 報告。

---

## 紀錄

- 2026-05-14 William 拍板（messages 1115-1142）
- A/B/C/D 本 session 完成
- E/F/G 留下次 session
- 寫入嚴格預設 only_self、跨改靠 can_write_others
- Cross-access 放員工層、用 multi-select、預設帶員工自己 branch/dept
