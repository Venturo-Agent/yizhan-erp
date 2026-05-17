# 旅遊團 × 訂單 × AI 需求單 Pipeline — 設計規格

> 狀態：📌 有效（2026-05-17 William × Logan 圓桌確認）

## 核心分野

三條資料線、職責不重疊：

| 資料實體 | 管什麼 | 誰管 |
|---------|-------|------|
| 旅遊團（tours） | 產品定義：行程、出發日、定價、容額、狀態 | 主管 / 產品操作人員 |
| 訂單（orders） | 交易：誰報名、帳單、收款、確認 | 業務 / 客服 |
| AI 需求單（ai_leads） | 未結構化詢問：客人說了想法但沒有現成的團 | AI Hub 客服業務 |

---

## 一、旅遊團狀態機

```
draft ──→ published（開團） ──→ booking_closed ──→ departed ──→ settled
  ↑模板/草稿    ↓可接訂單           ↓名額滿/截止       ↓出發了         ↓財務結清
```

### 狀態定義

| 狀態 | 對外 | 可建訂單 | 說明 |
|------|------|---------|------|
| `draft` | ❌ | ❌ | 內部規劃、主管尚未拍板 |
| `template` | ❌ | ❌ | 可重複使用的行程模板 |
| `published` | ✅ | ✅ | 已開團、官網上架、可接報名 |
| `booking_closed` | ✅（顯示額滿） | ❌ | 名額滿或截止日過，不再接單 |
| `departed` | ❌ | ❌ | 已出發，等待財務結清 |
| `settled` | ❌ | ❌ | 財務結清，封存 |

### Capability Gate

- `tours.write`：建立 / 編輯 draft、template
- `tours.publish`：draft → published（開團）— 只有主管層級
- 沒有 `tours.publish` 的人看不到「開團」按鈕

---

## 二、旅遊團頁面分類（UI）

```
旅遊團
├── 即將出發    （published + 出發日在未來）
├── 已出發未結帳 （departed，財務未 settled）
├── 模板         （template state，可複製開新團）
└── 全部         （含 draft，主管看）
```

> **不放「未處理」** — 未處理是訂單狀態，不是旅遊團狀態

---

## 三、兩條報名 Pipeline

### A. 官網報名（有產品才能報名）

```
官網只上架 published 狀態的旅遊團
         ↓
客人點選報名 → 填表 → 送出
         ↓
訂單建立，status = pending_review，source = 'website'
         ↓
業務收到通知 → 確認 → status = confirmed
         ↓
後續：收款、帳單、發票 掛在訂單上
```

**重點**：官網沒有「先詢問再開團」這條路，官網只呈現已開的團。沒開團 = 不在官網，不可能出現奇怪的半成品訂單。

### B. AI / LINE 詢問（不一定有現成的團）

```
客人透過 LINE / AI 說「想去日本七月」
         ↓
AI 收集旅遊需求（目的地、日期、人數、預算、特殊需求）
         ↓
建立「AI 需求單（ai_leads）」，status = new
         ↓
AI Hub 業務早上看需求單待辦清單
         ↓
    ┌────────────────────────────────┐
    │ 有現成 published 的團？        │
    │  YES → 直接開訂單 → 通知客人   │
    │  NO  → 評估是否開新團          │
    │         YES → 開 draft → 開團 → 開訂單
    │         NO  → 回覆客人替代方案  │
    └────────────────────────────────┘
```

**重點**：AI 需求單不是訂單，不進旅遊團，只是一個「待業務處理的詢問」。業務才是那個把詢問轉成訂單的人。

---

## 四、訂單（我的訂單）結構

### 收款 vs 請款分野

| 財務動作 | 掛在哪裡 | 理由 |
|---------|---------|------|
| 收款（客人付給我們） | 訂單 | 要知道哪個客人付的 |
| 請款（我們付給供應商） | 旅遊團 | 整團成本，如領隊費、景點、保險 |

### 訂單 UI 分類

```
我的訂單
├── 待確認    （source: website/line_ai，等業務接手）
├── 進行中    （confirmed，出發前）
├── 未結款    （已出發，收款未完整）
└── 已完成
```

### source 欄位

```typescript
type OrderSource = 'manual' | 'website' | 'line_ai'
```

`manual` = 業務直接在 ERP 內建立
`website` = 官網購物車來的
`line_ai` = LINE Bot / AI 需求單轉成的

---

## 五、AI 需求單（ai_leads）

### 位置

掛在 **AI Hub** 模組下，不在旅遊團也不在訂單。

### 欄位（草稿）

```
ai_leads
├── id
├── workspace_id
├── source               ('line' | 'web_chat' | 'other')
├── contact_line_user_id （如果是 LINE 來的）
├── contact_name
├── contact_phone
├── destination          (客人說的目的地)
├── preferred_dates      (客人說的日期範圍)
├── pax_count            (人數)
├── budget_range         (預算)
├── notes                (其他需求，AI 整理後)
├── status               ('new' | 'in_progress' | 'converted' | 'declined')
├── converted_to_order_id（轉成訂單後 FK）
├── converted_to_tour_id （觸發開新團後 FK）
├── assigned_to          (哪個業務接手)
├── created_at
└── updated_at
```

### 狀態流

```
new → in_progress（業務接手）→ converted（成功轉訂單）
                              → declined（無法成團、已告知客人）
```

---

## 六、RAG 知識庫連動

AI 的知識庫（RAG）只索引以下資料：

| 資料 | 條件 |
|------|------|
| 旅遊團資訊 | `status = 'published'` 才進 RAG |
| 訂單狀態 | 不進 RAG（個人資料） |
| AI 需求單 | 不進 RAG |
| 景點 / 行程 / 規格說明 | 全進 |

這樣 AI 不會：
- 把 draft 中的行程資訊說出去
- 讓客人對未確定的團下訂
- 把別的客人的訂單資訊混入回覆

---

## 七、待實作清單

| 項目 | 優先度 | 備註 |
|------|-------|------|
| tours 加 `status` 欄位 + 狀態機 migration | 🔴 高 | 目前沒有 status 欄位 |
| 旅遊團 UI 分類調整 | 🔴 高 | 依新 status 做 filter |
| orders 加 `source` 欄位 | 🟡 中 | |
| AI 需求單（ai_leads）table + UI | 🟡 中 | AI Hub 模組下 |
| 官網報名表單（對外頁面） | 🟡 中 | published 團才可報名 |
| RAG 索引過濾（只 published 旅遊團） | 🟡 中 | AI 知識庫 |
| `tours.publish` capability + gate | 🟡 中 | 主管才能開團 |
