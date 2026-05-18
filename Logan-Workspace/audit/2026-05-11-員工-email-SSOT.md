---
title: 員工 email — single source of truth 設計
created: 2026-05-11
owner: William
status: William 拍板、Logan 動工中
related:
  - "[[yizhan-erp/CLAUDE.md]] 一刀切純 email 登入鐵律"
trigger: 張文嘉（E002）case — William 填了 email、結果登不進、用系統帳號回頭看 employees.email 是空
---

# 員工 email — Single Source of Truth

## 1. 踩坑記錄（2026-05-11 01:48）

William 在 production 新增員工張文嘉、填了 email、按存檔成功、但無法用該 email 登入。系統帳號回去看：

```
employees.id  = d5a25b03-5c6e-4962-a3f6-160a6aca5eb3
employees.email = '' （空字串）
auth.users.email = corner_e002@venturo.com  ← API 自動生成的 fallback
```

**4 個 bug 互相疊起來才這麼亂**：

| # | 在哪 | bug |
|---|---|---|
| 1 | `EmployeeForm.tsx` payload | email 塞 `personal_info.email`、不是 top-level → API 收到的 employeeData 沒 top-level email → INSERT 進 employees.email 變空 |
| 2 | `/api/employees/create` line 71 | `authEmail = ${workspaceCode}_${employee_number}@venturo.com` 硬寫死、完全忽略你填的 email |
| 3 | `updateEmployee` hook（員工編輯）| 走 supabase client 直接 UPDATE employees 表、**完全沒 sync auth.users.email** → 編輯員工的 email 永遠登不進新 email |
| 4 | SSOT 沒對齊 | `employees.email` / `employees.personal_info.email` / `auth.users.email` 三處可能不同步、沒 sync 機制 |

**hotfix（5/11 01:54）**：直接 SQL update auth.users.email + employees.email 救張文嘉、改成 carson@cornertravel.com.tw。

## 2. 設計拍板（William 2026-05-11 02:00）

> 「以前沒有提供 Mail 功能、但既然現在建立了、我覺得就用最正確的方式、直接填寫他們的 Email。就是這樣、沒有別條路、而且也不要自動建立。」

### 2-1 SSOT

`employees.email` 是員工 email 的 single source of truth。

`auth.users.email` 必須跟 `employees.email` 一致（登入用）、寫入時同步。

`employees.personal_info.email` **廢棄**（schema 不砍、避免 break、UI 不再讀寫）。

### 2-2 鐵律

- ✅ 員工 email 強制必填
- ❌ **沒有 fallback、沒有 auto-generate**（不要再寫 `${workspace}_{employee_number}@venturo.com` 這種）
- ❌ **不自動建立**（沒填 email 不能新增員工）
- ✅ 沒 email 的員工 = 不能進系統、用其他方式記人
- ✅ 員工 email 編輯 → 同時 sync employees.email + auth.users.email

### 2-3 對齊既有鐵律

對齊 5/10 commit 891e24b「一刀切純 email 登入、砍 employee_number 路徑」。
之前 fallback `${workspace}_{employee_number}@venturo.com` 是「砍 employee_number 路徑」的殘骸 — 表面砍了 employee_number 登入、實際 API 還偷偷生 fallback email、讓 employee_number 變相回來。

## 3. 改動清單

### 3-1 Hotfix 1（避免新員工繼續壞）— 一個 commit

**`src/lib/validations/api-schemas.ts` createEmployeeSchema**：
```ts
// 前：email: z.string().email().max(255).optional().nullable(),
// 後：email: z.string().email('email 格式錯誤').max(255),  // required
```

**`src/app/api/employees/create/route.ts` line 71**：
```ts
// 前：const authEmail = `${workspaceCode}_${employeeData.employee_number.toLowerCase()}@venturo.com`
// 後：const authEmail = employeeData.email  // schema 已強制 required、必有值
```

**`src/app/(main)/hr/_components/EmployeeForm.tsx` payload line 334**：
```ts
// 前：payload 只有 personal_info.email
// 後：payload 加 top-level email: formData.email
//     personal_info.email 保留（相容轉移期、UI 廢棄但 schema 還在）
```

### 3-2 Hotfix 2（員工編輯 sync auth.users.email）— 第二個 commit

**新建 `src/app/api/employees/[id]/route.ts`** PATCH method：
- guard `hr.employees.write` capability
- UPDATE employees（含 email）
- 如果 email 變了 → `supabase.auth.admin.updateUserById(user_id, {email, email_confirm: true})`
- 兩個都成功才 return success

**`src/app/(main)/hr/_components/EmployeeForm.tsx`** handleSubmit isEditMode 分支：
- 從 `updateEmployee(id, payload)` 改成 `fetch('/api/employees/'+id, {method: 'PATCH', body: payload})`
- 不走 supabase client（client 沒 admin 權限改 auth.users）

**`src/data/entities/employees.ts`**：
- `_updateEmployee` 保留（backward compat）、但 EmployeeForm 不用了
- 之後可整 caller 統一走 PATCH API、`_updateEmployee` 砍掉

### 3-3 規格 + 文件 — 順便

- 本卡（規格 + 設計拍板）
- yizhan-erp/CLAUDE.md 紅線可加一條「員工 email = SSOT、新增 / 編輯都要 sync auth.users.email、禁止任何 hardcoded fallback」

## 4. 影響面

### 已踩坑的員工 row

| employee_id | 狀態 |
|---|---|
| `d5a25b03-5c6e-4962-a3f6-160a6aca5eb3`（張文嘉 / E002）| ✅ 已 hotfix（auth + employees email = carson@cornertravel.com.tw）|

### 其他可能受影響

之前 4 個員工（DEMO / 范詩屏 / WILLIAM / Smoke Tester）兩邊 email 都同步、沒問題。但其他 workspace 的員工要查、可能有同樣 case：

```sql
-- 找出 employees.email 跟 auth.users.email 不一致的員工
SELECT e.id, e.employee_number, e.chinese_name, e.email AS emp_email, au.email AS auth_email
FROM public.employees e
JOIN auth.users au ON au.id = e.user_id
WHERE e.email IS DISTINCT FROM au.email
ORDER BY e.created_at DESC;
```

修完 hotfix 後跑這個 query、對 mismatch 的 case 一個個確認真實 email。

## 5. 規範要更新的條目

`yizhan-erp/CLAUDE.md` 紅線可加（需 William 拍板）：

```
### N. 員工 email = single source of truth

- 員工新增 / 編輯時、email 強制必填、禁止任何 fallback / auto-generate
- employees.email = SSOT、auth.users.email 必須同步
- 編輯員工的 API 必須同時 update employees + auth.users（不可只改一邊）
- 沒 email 的員工 = 不能新增（不能進系統）
- personal_info.email 廢棄、不再讀寫
```

或者收進「員工 SOP」/「auth 鐵律」section。

## 6. 工時

| 項 | 工時 |
|---|---|
| 規格卡（本卡） | 30 分 |
| Hotfix 1（API + schema + UI payload） | 30 分 |
| Hotfix 2（PATCH API + UI 接） | 1 小時 |
| Type-check + build + commit + push | 30 分 |

**總**：約 2.5 小時。

---

> Logan 寫於 2026-05-11、踩坑 + William 拍板後立刻動工
