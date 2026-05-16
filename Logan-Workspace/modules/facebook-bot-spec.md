---
title: Facebook Bot（facebook_bot）— Spec
module: facebook_bot
status: active
owner: Logan
created: 2026-05-15
---

# Facebook Bot Module Spec

> Messenger 整合：客戶 FB 私訊 → 進系統 messaging_inbox、員工可接手回。

## Schema

- `workspace_integrations` 表內 integration_code='facebook_bot' row
- 加密儲存 page_access_token / verify_token

## Setup

走 `/setup/[token]` magic link、客戶自己填 token → 跑 setup-pipeline 驗證

## 不變式

- token 必加密存（integration_encryption）
- webhook 走 signature 驗證、不開放匿名
- 對話進 messaging_inbox 自動綁 customer_id

## Capability

`facebook_bot.read|write` / `facebook_bot.config`

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R23） |
