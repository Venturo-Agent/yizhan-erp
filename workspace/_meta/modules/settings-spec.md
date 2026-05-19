---
title: 個人設定（settings）— Spec
module: settings
status: active
owner: Logan
created: 2026-05-15
---

# Settings Module Spec

> 個人帳號 / 公司資訊 / 整合設定。

## Business Intent

- 個人：密碼 / 偏好設定
- 公司：基本資料 / 銀行 / 印章 / 結帳設定

## Sub-modules

- `settings.personal`：個人設定
- `settings.company`：公司資訊

## 不變式

- 改密碼必走舊密碼驗證
- 公司資訊改動需 `workspaces.write`

## Capability

- 自己改自己：no cap
- 改公司資訊：`workspaces.write`

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R20） |
