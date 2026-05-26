# Round 4 Audit — 2026-05-20 06:20（真上線模式）

> 作者：Max（動真 code）
> 派工：Claude Opus
> 模式：**Sub-task A（audit）→ B（migration）→ C（src code）**

---

## Sub-task A — 業務語意 disambiguation（audit）

### 結論矩陣

| 表                    | created_by/updated_by 指向             | 結論                                                                  | 原因                                                                        |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `tour_control_forms`  | → `auth.users(id)`                     | **違反紅線 B**：團控表是 ERP 業務資料、created_by 應指 employees      | COMMENT `團控表資料`、非個人上傳物件                                        |
| `image_library`       | → `auth.users(id)`                     | **違反紅線 B**：圖庫是 workspace 等級共享素材、由員工上傳、管理者管理 | COMMENT `圖庫資料表` + `workspace_id` + `category`/`attraction_id` 商業欄位 |
| `file_system.folders` | → `auth.users(id)`                     | **違反紅線 B**：workspace 樹狀資料夾、員工建立組織檔、應指 employees  | COMMENT `虛擬資料夾結構，支援樹狀目錄` + workspace scope                    |
| `file_system.files`   | → `auth.users(id)`                     | **違反紅線 B**：workspace 等級檔案、員工上傳業務文件、應指 employees  | COMMENT `檔案記錄，關聯團/客戶/供應商` + workspace scope                    |
| `email_accounts`      | `owner_id` → `employees(id)`（已正確） | **無需修改**：個人郵件帳戶綁定員工、owner_id 本來就指向 employees     | `account_type IN ('shared','personal')` + `owner_id` 已是 employees         |

### image_library / file_system 判定邏輯

和 `tour_control_forms` 同一類：都是 workspace scope 的 **ERP 業務資料**，員工是 acting user 但 audit trail 應該追到 employee record。

`email_accounts` 不一樣：它有兩種 mode（shared/personal），personal 時 `owner_id` 明確綁定員工、已正確。

---

## Sub-task B — 紅線 B FK migration（寫入磁片、不 apply）

檔名：`20260520070000_fix_red_line_b_audit_fk.sql`

影響範圍：

- `tour_control_forms.created_by / updated_by`
- `image_library.created_by`
- `file_system.folders.created_by`
- `file_system.files.created_by / updated_by`

email_accounts 不需要（owner_id 已正確）。

---

## Sub-task C — salary_settlements submit 加 closed period guard（改 src code）

### 發現

submit route (`POST /api/hr/salary-settlements/[id]/submit`) 的保護：

- ✅ 有 `status='draft'` check（防重 submit）
- ✅ 有 `workspace_id` check（防跨 workspace）
- ❌ **無 accounting period is_closed check**

如果 2026-03 的薪資結算已被月結（`accounting_periods.is_closed = true`），員工仍可在 5 月對 3 月的結算 batch 點「確認」、產生一張新的 payment_request、帳務數字會錯。

### 修法

在 submit handler 開頭（第 1 步 fetch settlement 之前）新增：

```
查 accounting_periods WHERE workspace_id = guard.workspaceId AND period_name = settlement.period
如果 is_closed === true → return 409 { error: '此期間已關帳' }
```

使用 `db-error-translate` 的回應格式。

---

## Commit 順序

1. `fix(rls): Sub-task A — 紅線 B 業務語意 disambiguation — Round 4`
2. `fix(rls): Sub-task B — 紅線 B FK migration（不 apply）— Round 4`
3. `fix(hr): Sub-task C — salary_settlements submit 加 closed period guard — 紅線 D`
4. `audit(round-4): 修法完成、等 Claude 覆查 + apply + push`
