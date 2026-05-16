---
title: 租戶（workspaces）— Spec
module: workspaces
status: active
owner: Logan
created: 2026-05-15
---

# Workspaces Module Spec

> 多租戶 SaaS 的核心：每個 workspace = 一家公司、所有資料隔離。漫途自己是「平台 workspace」、可管其他 workspace。

## Business Intent

- 多 tenant SaaS 平台
- 客戶簽約 → 建 workspace → 客戶完成 setup
- 漫途管 features / billing / addons / 結帳設定

## Schema

主要表：`public.workspaces`
- `id` / `name` / `code` / `tax_id`
- `is_active` / `setup_completed_at` / `setup_banner_dismissed_at`
- HR 政策：`leave_policy` / `pension_system`
- 結帳設定：`transfer_fee_mode` / `transfer_fee_unified_amount` / `transfer_fee_overflow_account_id`
- 出帳設定：`default_billing_day_of_week`

子模組：
- `workspaces.overview` / `.features` / `.addons` / `.ai-settings` / `.billing` / `.integrations`

## 不變式

- I1：跨 workspace 資料絕對隔離（RLS 嚴守、紅線 A）
- I2：workspaces 表不 FORCE RLS（漫途要能管別家、走 capability）
- I3：沒有 admin bypass / 沒有特權（鐵律 #9）

## Acceptance Criteria

- 新簽約：建 workspace + 發 setup_token → 客戶完成 setup
- 漫途管別家：用 `workspaces.write` capability
- setup_completed_at IS NULL → 顯示 SetupBanner

## 反例

- ❌ 不准 hardcode workspace ID（漫途自己也是 workspace、走 features）
- ❌ 不准 workspaces table FORCE RLS
- ❌ 不准 if (workspace.type === 'platform') bypass

## Capability

- `workspaces.read` / `workspaces.write`
- 客戶看自己 workspace 不需要 capability（RLS 自動過）

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R19）含 setup gate 設計 |
