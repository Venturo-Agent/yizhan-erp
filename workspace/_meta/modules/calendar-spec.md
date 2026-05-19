---
title: 行事曆（calendar）— Spec
module: calendar
status: active
owner: Logan
created: 2026-05-15
---

# Calendar Module Spec

> 公司事件 / 會議 / 員工生日 / 團出發日綜合呈現、FullCalendar 為主。

## Business Intent

- 公司內部事件（會議 / 教育訓練）
- 衍生事件：員工生日 / 團出發日 / 結團日（不存獨立 row、用 view）

## Schema

- `events`：手動建的事件（不衍生）
- view：員工 birthday / tours.departure_date / tours.return_date 等

## 不變式

- I1：event.workspace_id 不可改
- I2：日期一律 Asia/Taipei（用 formatDateTaipei）
- I3：衍生事件不可在 calendar 改、要去 source（tour / employee）改

## Acceptance Criteria

- 拖拉新事件 → datetime 用台北時區
- 看 month / week / day view
- 衍生事件以不同顏色顯示（不可編輯）

## 反例

- ❌ 不准用 UTC 日期儲存事件（必走 formatDateTaipei）

## Capability

`calendar.read|write`

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R16） |
