---
title: 團屬性（tour_attributes）— Spec
module: tour_attributes
status: active
owner: Logan
created: 2026-05-15
---

# Tour Attributes Module Spec

> 旅遊團的額外屬性（標籤 / 類型 / 推薦組合）、跟 tours 一對多。

## Schema

`tour_attributes` 表：tag / type / 自訂屬性 key-value

## 不變式

- 屬性不可砍如果有 tour 引用（用 archive）
- workspace_id 嚴守

## Capability

`tour_attributes.read|write`

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R25） |
