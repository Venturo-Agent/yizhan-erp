---
title: 資料管理（database）— Spec
module: database
status: active
owner: Logan
created: 2026-05-15
---

# Database Module Spec

> 旅遊資料庫的「資料維護端」：景點 / 飯店 / 餐廳 / 供應商。給 itinerary / quote 引用。

## Business Intent

- attractions（景點）/ hotels / restaurants 資料
- suppliers（供應商）+ bank info
- 封存管理（archive、不刪資料、僅標記）

## Schema

- `attractions` / `hotels` / `restaurants`（含 archived flag）
- `suppliers`（含 bank_code / bank_name）

## 不變式

- I1：suppliers 已綁 payment_request 不可砍
- I2：attractions 已被 itinerary 引用、archive 後不顯示但保留資料
- I3：bank_code 必填（給匯款手續費「同行 / 跨行」判斷）

## Acceptance Criteria

- 建 supplier 必填 name + bank_code + bank_name
- 引用中的 attraction archive：itinerary 仍能顯示舊資料
- attractions / hotels / restaurants 三表獨立 capability

## 反例

- ❌ 不准 hard delete suppliers（用 archive）

## Capability

`database.attractions.read|write` / `database.suppliers.read|write` / 各 sub-table

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R17） |
