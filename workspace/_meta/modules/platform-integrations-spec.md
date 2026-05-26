---
title: 平台整合（platform_integrations）— Spec
module: platform_integrations
status: active
owner: Logan
created: 2026-05-15
---

# Platform Integrations Module Spec

> AiToEarn 等對外整合平台、行銷自動發布工具。

## Sub-modules

- `platform_integrations.aitoearn`：AiToEarn 整合

## 不變式

- 對外 API key 加密儲存（integration_encryption）
- 走 magic link `/setup/[token]` 設定

## Capability

`platform_integrations.read|write`

## 變更

| 日期       | 變更            |
| ---------- | --------------- |
| 2026-05-15 | 初版（QDF R25） |
