---
title: Migration Rollback Policy
created: 2026-05-15
status: active
owner: Logan
related: [[01-safety-blueprint]]
---

# Migration Rollback Policy

## 為什麼

migration 出錯時要能快速回滾。但「Rollback 註解」≠ 真能完整 rollback（譬如 DROP TABLE 後 data 已沒）。
Policy 區分：
1. **未來 migration**：強制必須有 Rollback 註解
2. **歷史 migration**：不強補（無法救已遺失 data、補 Rollback 註解意義有限）

## 規則

### R1 — Rollback 註解強制範圍
- 從 **2026-05-15** 起、所有 critical migration 必須含 Rollback 區段
- audit:migration-rollback-coverage 設 `ROLLBACK_REQUIRED_FROM = '20260515'`
- 新 migration 沒寫 Rollback → CI 紅

### R2 — Critical migration 定義
- 含 `DROP TABLE`
- 含 `DROP COLUMN`（with data）
- 含 `ALTER COLUMN TYPE`（可能 silent truncate）
- 含 `TRUNCATE`
- 含 `DELETE FROM`（不純粹 fix typo 的）
- 含 `ALTER COLUMN ... DROP NOT NULL`（弱化約束）

### R3 — 不可逆 migration 必走 _pending_review
- DROP TABLE / DROP COLUMN with data 等不可逆動作
- 不直接放 supabase/migrations/、放 `_pending_review/`
- 等 W 拍板才搬正常 migrations/

### R4 — Rollback 註解格式

```sql
-- ════════ Rollback（萬一爆炸、複製貼上跑）════════
-- BEGIN;
-- ALTER TABLE public.xxx DROP COLUMN IF EXISTS new_col;
-- COMMIT;
```

要求：
- 用 `--` SQL comment（不真執行）
- 含 `BEGIN; ... COMMIT;` 包好
- 反向 SQL（譬如 ADD COLUMN 反向 DROP COLUMN）

### R5 — 歷史 critical migration 不強補
- 已 apply 過的歷史 migration 不強補 Rollback（補了也無用、data 已遺失）
- 但 audit 工具仍列出、給之後 grep / 緊急 reference 用
- 若 production 出問題、case-by-case 寫 emergency rollback、不依賴歷史註解

## 例外（不算 critical）

- 純 INSERT seed（不擾動既有 data）
- 純 CREATE TABLE / ADD COLUMN（DDL 可逆）
- 純 ALTER COLUMN ... SET DEFAULT（不弱化約束）

這些可以省 Rollback 註解、但寫了也無害。

## Workflow

寫 migration 時遵守：

```
1. 評估 migration 是否 critical（R2 定義）
   ↓
2a. 如果 critical 且不可逆 → 進 _pending_review/、等 W 拍板
2b. 如果 critical 但可寫 reverse → 寫 Rollback 註解
2c. 如果非 critical → 可選寫 Rollback
   ↓
3. 跑 npm run audit:migration → 確認 Recent 100%
   ↓
4. apply migration（local dev → staging → production）
   ↓
5. apply 後也保留 Rollback 註解（之後 emergency 用）
```

## 當前狀態（2026-05-15）

- 全 migration：750 個、覆蓋 8.5%
- Critical：118 個、其中 87 個沒 Rollback
- Recent（20260515+）：21 個、覆蓋 **100%** ✅

## 之後做（不在本 policy 範圍）

- audit:migration-safety：檢查不可逆 migration 有沒走 _pending_review/
- 自動產生 reverse SQL（從 DDL 衍生）— 工程量大、暫不做
