---
title: 訊息收件匣（messaging_inbox）— Spec
module: messaging_inbox
status: active
owner: Logan
created: 2026-05-15
---

# Messaging Inbox Module Spec

> 統一收 LINE / FB / IG bot 訊息、員工接手、回覆送回原平台。

## Schema

- `messaging_threads`（一個對話、綁 customer_id + channel）
- `messaging_messages`（thread 內訊息、direction: inbound / outbound）

## 不變式

- 一個 line_user_id / fb_user_id / ig_user_id → 一個 thread per channel
- thread 自動綁 customer_id（首次來訊時建 / match）
- AI 回覆 message_type='ai'、人工 'human'、需區分

## Capability

`messaging_inbox.read|write`

## 變更

| 日期       | 變更            |
| ---------- | --------------- |
| 2026-05-15 | 初版（QDF R24） |
