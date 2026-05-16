---
title: Instagram Bot（instagram_bot）— Spec
module: instagram_bot
status: active
owner: Logan
created: 2026-05-15
---

# Instagram Bot Module Spec

> IG DM 整合、跟 facebook_bot 同套機制。

## Schema

`workspace_integrations` integration_code='instagram_bot'

## Setup

走 `/setup/[token]` magic link

## 不變式

跟 facebook_bot 相同：token 加密 / webhook 簽名 / 自動綁 customer

## Capability

`instagram_bot.read|write` / `instagram_bot.config`

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R23） |
