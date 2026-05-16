---
title: LINE Bot（line_bot）— Spec
module: line_bot
status: active
owner: Logan
created: 2026-05-15
---

# LINE Bot Module Spec

> LINE Official Account 整合、訊息進 messaging_inbox。

## Schema

`workspace_integrations` integration_code='line_bot'、加密 channel_access_token / channel_secret

## 設定

走 `/setup/[token]` magic link、客戶貼 LINE Developers 後台拿的 token

## 不變式

- channel_secret 用來驗 webhook signature
- 對話自動建 thread → 綁 customer_id（用 line_user_id）
- AI 回覆走 ai_hub generateBotReply（如啟用）

## Capability

`line_bot.read|write` / `line_bot.config`

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R23） |
