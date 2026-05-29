---
created: 2026-05-08
updated: 2026-05-29
review_owner: william
status: active
---

# Migrations Pending — 唯一草稿區

> 本目錄是 supabase migration 的**唯一草稿入口**。
> 不會被 Supabase CLI 自動 apply，必須由 William 拍板後走 Migration SOP 移到正式 `supabase/migrations/`。

2026-05-29 B13 整理：原本散在三處的草稿（migrations-pending/ + migrations/_pending_review/ + migrations/_rejected/）已合一在此目錄。

---

## 目錄結構

```
supabase/migrations-pending/
├── README.md                         ← 本檔（草稿區規範）
├── <timestamp>_<purpose>.sql         ← 純加法草稿（待 William 拍板 apply）
├── _pending_review/                  ← 需要 review 的草稿（destructive 或 schema 改動大）
└── _rejected/                        ← 已決定不採用 / 已被別的 migration 取代的歷史殘留
```

---

## 入庫流程（草稿 → 正式 migration）

1. 在本目錄寫 SQL：`<purpose>.sql` 或 `<timestamp>_<purpose>.sql`
2. 加進「待 apply 順序」清單下方、寫清楚為什麼、ADR / backlog 連結、相依關係
3. William review 拍板
4. 改名為 `YYYYMMDDHHMMSS_<purpose>.sql`（時間戳到秒）
5. 搬到 `supabase/migrations/` 走 [Migration SOP](../../CLAUDE.md)（寫檔 → commit → MCP apply → 驗證）
6. 從本目錄移除

---

## 待 apply 草稿（active）

### 純加法（migrations-pending 根目錄）

| 檔案                                                | 用途                                  |
| --------------------------------------------------- | ------------------------------------- |
| `20260516120000_add_sign_token_to_contracts.sql`    | 加 contracts.sign_token，待簽署流程上線同步 apply |

### 需要 review（`_pending_review/`）

| 檔案                                                       | 用途                                    | 卡點 |
| ---------------------------------------------------------- | --------------------------------------- | ---- |
| `20260517210000_sec009_ai_api_keys_vault.sql`              | AI API keys 改走 Supabase Vault         | 等 Vault extension 啟用、見 `src/lib/vault.ts` 註解 |
| `20260520_migrate_customer_passport_to_documents.sql`      | passport 欄位搬到 documents 子表       | 等 backend 切換 |
| `20260526130000_finance_list_sort_keys.sql`                | 財務列表多欄複合排序 keys              | 等 B 階段地基驗收 |

---

## 已棄用草稿（`_rejected/`、保留歷史 audit trail、不再 apply）

| 檔案                                                 | 為什麼進 _rejected                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `20260415000000_enable_ai_settings_rls.sql.skip`     | 舊 RLS pattern（含 `is_super_admin()`、紅線 #0 已禁），新方案另寫                     |
| `20260415110000_create_audit_logs.sql.skip`          | audit_logs 已改由 `20260509080538_002_audit_logs_table.sql` 正式建立、本檔反 SSOT |
| `20260415130000_stage0_5_fix_tyn_add_hhq.sql`        | 4 月國家 / 機場 stage 重構草案（stage 0.5 ~ 3）、已被其他 migration 取代              |
| `20260415140000_stage1_ref_destinations_and_globalize_airports.sql` | 同上 |
| `20260415150000_stage2_ref_countries.sql`            | 同上 |
| `20260416000001_stage3_add_country_code_to_business_tables.sql` | 同上 |
| `2026-04-18/20260418_drop_employee_job_roles.sql`    | 4 月權限重構初稿、被 capability 系統取代                                              |
| `2026-04-18/20260418_employee_capabilities_system.sql` | 同上 |
| `2026-04-18/20260418b_fix_capability_naming_plus_guide.sql` | 同上 |
| `CLEAN_MIGRATION.sql`                                | 早期手跑版（user_preferences / notes / manifestation_records）、用舊 `auth.uid()` pattern、三張表已由正式 migration 建立 |

> ⚠️ `_rejected/` 是**只讀歷史**、不再 apply、不再改。要做新事情、另起 migration。

---

## 為什麼會有 `_pending_review/` 跟 `_rejected/`

- `_pending_review/` — 改動破壞性大、需要 William 額外 review（destructive / 大 schema 改 / 影響面廣）
- `_rejected/` — 已被別的 migration 取代、或方向改了不用了；保留檔案做 audit trail、避免後人重複嘗試相同錯誤路徑

---

## 跟正式 migration 的差別

| 維度       | `supabase/migrations/`         | `supabase/migrations-pending/`             |
| ---------- | ------------------------------ | ------------------------------------------ |
| 命名       | `YYYYMMDDHHMMSS_<purpose>.sql` | 自由（草稿、未確定）                       |
| Apply      | 走 MCP `apply_migration`       | **不會被自動跑**、要先搬正式目錄           |
| Git track  | ✅ 是                          | ✅ 是（草稿也要進 repo、避免漂移）         |
| Audit      | 進 `audit:rls` / `audit:writes` | 不進（草稿不算正式紀錄）                  |

---

## 相關文件

- [Migration SOP（CLAUDE.md）](../../CLAUDE.md)
- [APPLY_MIGRATION.md](../APPLY_MIGRATION.md)
- [整理 backlog B13](../../workspace/架構整理/2026-05-29-整理backlog.md)
