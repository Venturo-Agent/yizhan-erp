---
title: <Module 中文名> — Spec
module: <module_code>
status: draft / active
owner: <負責人>
created: YYYY-MM-DD
related: [[其他 spec link]]
---

# <Module 中文名> Spec

> 一段話描述：這 module 解什麼問題、給誰用、跟其他 module 怎麼接。

## 1. Business Intent（業務目的）

- 為什麼存在這 module？解什麼業務痛點？
- 主要使用者是誰（角色 / 功能）？
- 跟外部哪些單位 / 系統互動？

## 2. 核心 entity & schema

- 主要 DB 表 + 關鍵欄位
- 跟其他 module 的 FK 關係
- 重要 enum / 狀態機

## 3. 不變式（Invariants）

業務上「永遠成立」的規則、之後 review 都對齊：

- I1：<譬如「請款單一張只能對應一個供應商」>
- I2：<譬如「結算後狀態不可逆轉」>
- I3：...

## 4. Acceptance Criteria

該 module 上線 / 重構驗收：

- [ ] AC1：<可測試的具體行為>
- [ ] AC2：...
- [ ] AC3：...

## 5. 反例（Anti-patterns）

「絕對不能這樣寫 / 操作」：

- ❌ <譬如「不准 hardcode isAdmin bypass capability check」>
- ❌ <譬如「不准跨 workspace 操作不走 capability gate」>

## 6. 跨 module 依賴

| 依賴 module | 關係 | 注意 |
|------------|------|------|
| <module> | <fk / event / cap> | <譬如「shared_data 必須先設、否則建單失敗」> |

## 7. UI / Route 對應

| Route | Layout | 主要 component |
|-------|--------|----------------|
| /xxx | ListPageLayout | <主要 dialog / table> |
| /xxx/[id] | ContentPageLayout | <detail / edit> |

## 8. Capability / 權限

- 讀：`{module}.read` / `{module}.{tab}.read`
- 寫：`{module}.write` / `{module}.{tab}.write`

## 9. Audit log policy

- 哪些操作必加 recordApiAuditContext
- audit_log 內 reason 字串範本

## 10. 變更歷史

| 日期 | 變更 | 對應 spec / commit |
|------|------|-----------------|
| YYYY-MM-DD | 初版 | this file |
