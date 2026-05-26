---
title: 儀表板（dashboard）— Spec
module: dashboard
status: active
owner: Logan
created: 2026-05-15
---

# Dashboard Module Spec

> 登入後首頁、grid 自製 widget 顯示重要指標。

## Business Intent

- KPI 摘要（當月收款 / 待付款 / 待結算）
- 待辦提醒
- 重要 alerts

## 不變式

- 純讀、不改 DB
- 載入慢點不阻擋（widget 個別 SWR）

## Capability

`dashboard.read`（所有登入員工）

## 變更

| 日期       | 變更            |
| ---------- | --------------- |
| 2026-05-15 | 初版（QDF R21） |
