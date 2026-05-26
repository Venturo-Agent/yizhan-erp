---
title: 景點資料庫 addon（addon_data_attractions）— Spec
module: addon_data_attractions
status: active
owner: Logan
created: 2026-05-15
---

# Addon: Data Attractions

> 進階景點資料庫（multimedia / 評分 / 推薦相關）、付費 addon。

## Business Intent

擴充 database.attractions 基本資料的進階功能：照片管理、評分、AI 推薦等。

## Capability

`addon_data_attractions.read|write`

## 啟用條件

workspace_features 表內 feature_code='addon_data_attractions' enabled=true

## 變更

| 日期       | 變更            |
| ---------- | --------------- |
| 2026-05-15 | 初版（QDF R22） |
