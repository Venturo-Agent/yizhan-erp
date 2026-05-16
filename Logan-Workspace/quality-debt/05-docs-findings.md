---
title: 品質債深掃 #5 文檔 / 可追溯 — finding 報告
created: 2026-05-15
owner: Logan
status: 淺盤、深做留下次
---

# 文檔 / 可追溯 finding（2026-05-15）

## Baseline

### Spec 覆蓋率
- Module 數：30
- Logan-Workspace/ 內 spec.md：14 個
- 覆蓋率：**46.7%**

### Migration rollback 覆蓋率
- 總 migration：750 個
- 含 Rollback 註解：57 個
- 覆蓋率：**7.6%**（嚴重低）

## 主要 finding

### 5.1 Spec 覆蓋率低（46.7%）
半數 module 沒對應 spec.md、新人 / Logan 自己後續接手難。

**該補 spec 的 module（典型）**：
- 既有 module 譬如 tours / orders / finance / hr 沒總體 spec.md
- 只有「新功能」spec（譬如 bonus-settlement-spec、leave-severance-spec）

### 5.2 Migration rollback 覆蓋率低（7.6%）
750 個 migration 中只 57 個有 Rollback 註解。

**風險**：
- migration 出錯時無法快速回滾
- production 出問題只能緊急寫 rollback、容易再錯

### 5.3 JSDoc / 註解品質
- 沒系統性盤點
- 觀察：lib/ 內 service 多半有 JSDoc、page / component 較少

## 下輪深做

### Phase 1：spec 範本拍板（半天）
- 每 module 該寫的段落：business intent / 不變式 / acceptance / 反例 / 跨 module 依賴
- 拍板後 30 個 module 一個個補（一個 30 min、預估 15 hr）

### Phase 2：migration rollback 補（一週）
- 每個新 migration 強制寫 Rollback 註解（已成慣例）
- 舊 migration 750 個太多、補不完 — 標 audit:migration-rollback-required-from = 今天、之後 enforce

### Phase 3：寫 audit:spec-coverage（半天）
- 掃 src/modules/*.ts、確認 Logan-Workspace 有對應 spec
- 缺則 yellow

### Phase 4：寫 audit:migration-safety（半天）
- 掃 supabase/migrations/、找
  - DROP TABLE / DROP COLUMN with data
  - ALTER COLUMN type （silent truncate）
- 沒走 _pending_review/ 路徑 → red
