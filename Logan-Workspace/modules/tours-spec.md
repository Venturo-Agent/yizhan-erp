---
title: 旅遊團（tours）— Spec
module: tours
status: active
owner: Logan
created: 2026-05-15
related: [[bonus-settlement-spec]] [[2026-05-15-出納單完整重構-spec]]
---

# Tours Module Spec

> 旅遊團是 ERP 內所有「業務金流」的根：訂單 / 收款 / 出納 / 獎金都掛在團上。團的生命週期（草稿 → 開團 → 確認 → 結團）決定其他下游業務何時可動。

## 1. Business Intent

- **解決痛點**：旅行社業務以「團」為單位收款 / 付款、需要一個 ledger 串連所有金流
- **使用者**：業務 / OP / 財務 / 主管
- **互動**：訂單 module（綁團）/ 收款（綁團）/ 請款（綁團）/ 出納（結團才能算獎金）/ 會計（傳票自動產生）

## 2. 核心 entity & schema

主要表：`public.tours`
- `id` UUID PK
- `code` TEXT UNIQUE（譬如 `XIY260311A`）
- `name` TEXT
- `departure_date` / `return_date`
- `status` ENUM: `planning` / `open` / `confirmed` / `closed` / `cancelled`
- `closing_date` TIMESTAMPTZ（結團 timestamp）
- `workspace_id` FK

子模組（tab）：
- `tours.overview` — 總覽
- `tours.orders` — 訂單列表
- `tours.members` — 團員
- `tours.itinerary` — 行程編輯
- `tours.display-itinerary` — 對外展示行程（付費）
- `tours.quote` — 報價
- `tours.contract` — 合約（付費）
- `tours.closing` — 結團 / 利潤計算 / 獎金設定

## 3. 不變式（Invariants）

- I1：team code 全 workspace 內 unique
- I2：tour.status 一旦 'closed'、不可回 'open'（紅線 D 不開後門、必須走「重開團」flow）
- I3：tour 有未付請款單時不可直接「砍」、必須先處理請款單
- I4：tour.workspace_id 一旦設、不可改（避免跨租戶資料遷移）

## 4. Acceptance Criteria

- [ ] AC1：建新團、status 預設 'planning'
- [ ] AC2：結團前可改 itinerary / 報價、結團後鎖
- [ ] AC3：結團觸發：寫 bonus_pending（不直接產獎金 PR）+ closing_date
- [ ] AC4：列印結案報告：含收入明細 / 支出明細 / 利潤計算表（左右兩欄）/ 獎金明細
- [ ] AC5：tours.write capability 才能新建 / 編輯 / 結團
- [ ] AC6：跨 workspace 看不到別家的團（RLS 守）

## 5. 反例

- ❌ 不准直接 update tour.status 跳過業務流程（譬如 from 'planning' 直接 → 'closed'）
- ❌ 不准 hardcode tour ID 在 code 內（避免某團特殊處理）
- ❌ 不准把「結團」當「軟刪除」用、tour 結團後仍可看 / 仍要產獎金結算

## 6. 跨 module 依賴

| 依賴 module | 關係 | 注意 |
|------------|------|------|
| orders | 訂單綁團（order.tour_id） | 結團時計算總收入用 |
| finance.receipts | 收款綁團 | 結團時計算總收入 |
| finance.requests | 請款綁團 | 結團時計算總支出 |
| hr_bonus_settlement | 獎金（tour_id PK） | 結團 → 寫 bonus_pending |
| accounting | 自動產傳票 | 結團觸發 |
| customers | 團員是客戶 | members tab 用 |
| database.attractions | 行程引用景點 | itinerary tab 用 |

## 7. UI / Route 對應

| Route | Layout | 主要 component |
|-------|--------|----------------|
| /tours | ListPageLayout | ToursPage / TourFormShell |
| /tours/[code] | ContentPageLayout | TourClosingSections / ProfitTab |

## 8. Capability

- 讀：`tours.read` / 各 tab `tours.{tab}.read`
- 寫：`tours.write` / 各 tab `tours.{tab}.write`
- closing 特例：`tours.closing.write` 才能結團

## 9. Audit log policy

必加 recordApiAuditContext：
- 結團（reason: `結團 ${tour.code}`）
- 重開團（reason: `重開團 ${tour.code}（理由）`）
- 軟刪除 / 復原（reason: 對應動作）

## 10. 變更歷史

| 日期 | 變更 | 對應 spec / commit |
|------|------|-----------------|
| 2026-05-15 | 初版（QDF Round 9 補） | this file |
