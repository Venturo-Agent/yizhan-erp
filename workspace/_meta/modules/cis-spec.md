---
title: 漫途 CIS（cis）— Spec
module: cis
status: active
owner: Logan
created: 2026-05-15
---

# CIS Module Spec

> 漫途自家「客戶簽約 + 衍生項目價目」管理、平台內部用。

## Business Intent

- 客戶資料（漫途的客戶 = 簽約 workspace 的負責人）
- 衍生項目價目（addons 各 feature 月費 / 一次性費用）

## Sub-modules

- `cis`（客戶管理）/ `cis.pricing`（衍生項目價目）

## 不變式

- 漫途自己的 workspace 才能用（漫途自家 SaaS 銷售工具）

## Capability

`cis.read|write`

## 變更

| 日期       | 變更            |
| ---------- | --------------- |
| 2026-05-15 | 初版（QDF R23） |
