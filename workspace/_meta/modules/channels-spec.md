---
title: 頻道（channels）— Spec
module: channels
status: active
owner: Logan
created: 2026-05-15
---

# Channels Module Spec

> Slack-like 內部對話系統 + bot 整合（LINE / FB / IG）統一收件。

## Business Intent

- 內部頻道（員工 group chat）
- 系統通知 channel（出納單剔除 / 提醒）
- 外部 messaging inbox（bot 訊息進來、可分派員工回）

## Schema

- `channels` / `channel_members` / `channel_messages`
- `messaging_threads`（外部對話、綁 customer_id）

## 不變式

- I1：channel.workspace_id 一旦設不可改
- I2：channel.type='system' 不可被 user 砍
- I3：訊息一旦發出不可改（要編輯走 message_versions）

## Acceptance Criteria

- 員工建頻道 → 邀請成員 → 互傳訊息
- 外部 bot 訊息收進 messaging_inbox、可指派員工
- 系統通知（譬如出納剔除）寫進「系統公告」channel

## 反例

- ❌ 不准跨 workspace 訊息洩漏（RLS 嚴守）
- ❌ 不准訊息批量刪除（用 revoke）

## 跨依賴

- customers（外部對話綁客戶）
- bot module（facebook / instagram / line）

## Capability

`channels.read|write` / `channels.manage.read|write`（管 channel 設定）

## 變更

| 日期       | 變更            |
| ---------- | --------------- |
| 2026-05-15 | 初版（QDF R15） |
