---
title: 待辦事項（todos）— Spec
module: todos
status: active
owner: Logan
created: 2026-05-15
---

# Todos Module Spec

> 個人 / 團隊 todo list、Kanban 看板。

## Schema

- `todos`（task）+ `todo_columns`（看板欄、譬如「待辦 / 處理中 / 完成」）

## 不變式

- todo.workspace_id 不可改
- column 排序用 display_order
- 個人 todo 跟團隊 todo 用 visibility 區分

## Capability

`todos.read|write`

## 變更

| 日期       | 變更            |
| ---------- | --------------- |
| 2026-05-15 | 初版（QDF R25） |
