# 一棧 ERP 健檢交付包 — 2026-05-20

> 給 William 看的「12 點大禮包」總覽
> 期間：19:00-（持續更新中）

---

## 一句話總結

**今天做了什麼**：把 5/19 SWR 健檢 + 5/20 兩輪 Round 11 已修的東西、加上今天 openclaw Pass 1 + 補做、整理成「**5 維度完整健檢框架** + 145 violation ratchet 已落地 + 5 個 P0 修法藍圖\*\*」。

**最重要的發現**：規範不破碎、是「**抽象層蓋好但 accounting 整模組沒搬上來**」。其他模組大致對齊紅線 F/G。
**最重要的好消息**：ratchet 機制（`.eslint-suppressions.json` + `lint:swr-prune`）已經落地、新 PR 加違規會被 CI 擋。

---

## 交付清單（檔案位置）

### A. 健檢框架（workspace/健檢/）

```
workspace/健檢/
├── SPEC.md                              ← 另一個 AI 早上做的、5 維度框架
├── tasks.md / checklist.md              ← 同上
├── ERP-App-討論框架.md                  ← 同上
├── reports/                             ← 各維度健檢
│   ├── 架構層面健檢.md                 ← 另一個 AI 做的（6 層架構 + SSOT + 抽象層）
│   ├── 資安層面健檢.md                 ← 另一個 AI 做的（紅線 A-G + RLS + 滲透）
│   ├── 效能層面健檢.md                 ← 我今晚寫的（SWR + Realtime + 列表 + Bundle）
│   └── 開發品管健檢.md                 ← 我今晚寫的（測試 + CI + lint + pre-commit）
├── decided/                             ← 已拍板、可直接執行
│   └── ratchet-baseline.md             ← 解釋現有 145 violations 凍結機制
└── pending/                             ← 等你拍板
    └── p0-p1-p2-修法清單.md            ← 5 P0 + 6 P1 + 5 P2、含工時估算
```

### B. SWR 細部 audit（workspace/\_meta/architecture/）

```
2026-05-20-swr-realtime-page-audit-charter.md            ← Pass 1 派工書
2026-05-20-swr-realtime-page-audit-pass1.md              ← Pass 1 + 補做（72 entries / 25 模組）
2026-05-20-swr-realtime-page-audit-pass1-supplement-charter.md
2026-05-20-swr-realtime-page-audit-pass1-complaint.md    ← 我的 Pass 1 複盤（抓 openclaw 3 個 bug）
2026-05-20-swr-realtime-page-audit-pass2-charter.md      ← Pass 2 派工書
2026-05-20-swr-realtime-page-audit-pass2.md              ← Pass 2 對錯判決（openclaw 進行中）
PASS1-LEARNINGS-2026-05-20.md                            ← openclaw 自我反思
PASS1-PROGRESS-2026-05-20.md                             ← Pass 1 進度檔
```

### C. DB 備份（~/Desktop/yizhan-erp-backup-2026-05-20/）

```
yizhan-erp-backup-2026-05-20.xlsx          ← 82 sheets、6.9 MB
82 個 .json 一張表一個檔                   ← JSON 原檔、31 MB
schema/
├── migrations/                            ← 814 個 migration 檔（10 MB）
├── schema-columns-snapshot.json           ← production 欄位 snapshot
├── rls-policies-snapshot.json             ← production RLS snapshot
└── triggers-snapshot.json                 ← production triggers snapshot
```

---

## 今天動的 code（不算 audit 文件）

只有 **1 個檔、1 行**：

- `src/components/layout/sidebar-config.ts:85` 刪 `'cis',` 死字串

commit dc00c13 chore(sidebar): 砍 'cis' 死字串 + 加 Pass 1 複盤報告 + 補做派工書

**沒有動真實業務 code、沒有 push、沒有 apply migration**。

---

## 重點發現（按重要性排序）

### 1. accounting 全模組是真痛點 🔴

**症狀**：傳票/科目/支票/4 個財報/期間結算/開帳餘額 — **整整 7 頁繞 entity hook、直接 supabase**。
**體感**：打傳票進去、UI 不會即時更新、要 F5。建會計科目同理。
**修法**：補 useJournalVouchers / useAccounts / useChecks entity hook、搬遷頁面。預估 8-12h。
**P0-1**、明天可動。

### 2. archive-management 歸檔 cascade delete 漏 invalidate 🔴

**症狀**：歸檔旅遊團後、calendar 跟行程編輯頁仍顯示已刪資料。
**修法**：對 `calendar_events` / `tour_itinerary_items` 加 invalidate。1h 搞定。
**P0-2**、明天可動。

### 3. settings/company 直接 supabase 讀寫 🔴

**症狀**：公司資料改完不即時。
**修法**：改 entity hook + apiMutate。2-3h。
**P0-3**。

### 4. CI 缺 audit:writes / audit:realtime 守門 🟠

**症狀**：5/14 onboarding 撞號事故同類問題、不會自動擋。
**修法**：改 ci.yml 加 jobs（不需 DB）。30 分鐘。
**P0-4**。

### 5. ChannelView 不是 smoking gun ✅

**openclaw Pass 1 誤判**：他說 `ChannelView.tsx:78` 發訊息 invalidate 對象錯。
**事實**：我親自讀檔、line 78 是「標已讀」流程；發訊息在 line 199 有正確 invalidate messages。
**寓意**：openclaw 抓 grep 結果就下判斷、沒讀完整 handler。Pass 2 我要求他改進這個毛病。
**channels 真痛點**（如果你還感受得到）：在 Realtime publication 或寫入路徑、不在 invalidate。

---

## 規範破碎程度 — 量化版

| 指標                                | 數值                        |
| ----------------------------------- | --------------------------- |
| 全頁面數                            | 67 個 page.tsx              |
| 全 component (含 Tab) Pass 1 已盤點 | 72                          |
| 抽象層採用率                        | ~78%（從 5/19 的 65% 上升） |
| `no-direct-useswr` 違規             | 18 處（18 檔）              |
| `no-direct-supabase-writes` 違規    | 127 處（53 檔）             |
| 散刻 `mutate('字串')`               | 0（5/19 9 處全清光）        |
| Realtime 訂閱但 publication 缺      | 0（5/20 剛補 8 張表）       |
| per-user cache key                  | ✅ 修完                     |

**結論**：規範對齊度約 80-90%。「破碎」的感受其實是 accounting 集中違規造成的局部痛點。

---

## ratchet 機制（不需要再做）

已落地：

- `.eslint-suppressions.json` 凍結 145 violations
- `npm run lint` 用 baseline 過濾、新違規 → CI 擋
- `npm run lint:swr-prune` 自動移除修好的

**新功能不會再加違規。** 舊違規漸進清。預估 1-2 月清光。

---

## 我建議明早怎麼動

### 立刻 1 小時內可清完（不需大決策）：

1. P0-2 archive-management invalidate（1h）
2. P0-4 audit:writes / audit:realtime 加 CI（30 min）
3. P0-5 11 個 lint errors 修（1h）

### 2-3 天時間做 P0 收尾：

4. P0-1 accounting 模組搬遷（8-12h、最大塊）
5. P0-3 settings/company entity hook（2-3h）

清完 P0 = user 端體感大幅改善。

### P1 / P2 = 1-2 週的事、不急。

---

## 還欠的東西（誠實版）

1. ~~openclaw Pass 2~~ **✅ 完成了**（commit c7468d7、355 行、74 entries 全判決）
2. **效能 deep dive**：列表頁查詢量 + Supabase egress 沒實測、靠估算
3. **e2e 測試覆蓋 Realtime 鏈路**：缺
4. **Storage bucket 備份**：客戶證件圖檔沒備（只備了 DB metadata）
5. **auth.users 備份**：靠 Supabase 內建 daily backup
6. **openclaw Pass 2 我尚未做完整複盤**（重要 spot check：shared-data 紅線 G 判定可能 false positive、accounting count 10 vs 我的 7 哪個對）

---

## openclaw Pass 2 最終結果（剛剛完成）

commit `c7468d7 audit(swr-pass2): 完成 74 entries 對錯判斷 — 5 smoking gun P0 / 8 P1`

### Pass 2 判決統計

- ✅ 合規 35
- ⚠️ 條件式合規 18
- ❌ 違規 11
- 🔴 P0 smoking gun 5
- 🟡 P1 smoking gun 8

### Pass 2 確認的 5 個 P0 smoking gun

1. `library/archive-management` — calendar_events / tour_itinerary_items 直接 delete 無 invalidate
2. `accounting/vouchers/page.tsx` — 直接 supabase 讀寫
3. `accounting/reports/balance-sheet/page.tsx` — 直接 supabase + 無 realtime
4. `accounting/reports/general-ledger/page.tsx` — 同上
5. `accounting/reports/income-statement/page.tsx` — 同上

### Pass 2 新發現（vs Pass 1）

- **shared-data 三頁 cache key 缺 workspace_id** — openclaw 認為違反紅線 G
  - ⚠️ 我尚未驗證此判定。`shared-data:banks/countries/airports` 是全域唯讀資料（台灣銀行 master / 全球國家機場），可能不需要 workspace_id。需 spot check。
- **accounting 違規數從 3 → 9** — 不只 vouchers/accounts/checks，加上 4 個財報頁 + period-closing + opening-balances
- **archive-management 根因確認** — Pass 1 半對的判定升級為確定

### Pass 2 學到的紀律（openclaw 自我反思）

- ✅ 進 entity 實體檔驗證、不只看 hook 名稱
- ✅ 讀完整 handler、不在 grep 第一個命中就停
- ✅ 74 entries 全覆蓋、不允許「待掃」

### openclaw 誠實列出沒深入的：

- `AttractionsTab.tsx` lazy load 未讀 write flow
- `OrganizationSection.tsx` 未深入
- `finance/requests` write flow handler 未深入
- `bonus-settlement/[tourId]/page.tsx` 未讀內容

---

## 答你 19:00 那個哲學問題

> 「規範破碎、要求 SSOT 但反而做不到」

不是規範破碎、是**抽象層覆蓋率不齊**。

- 紅線 0/A/B/C/D/G 都到位（資安類）
- 紅線 F（SSOT 寫入端）已落地但**舊頁面 grandfather**
- ratchet 已凍結舊違規、防新增

要「SSOT 真的做到」= 1-2 月時間漸進清舊違規 + ESLint rule 持續守。
不需要砍掉重寫。

---

_更新時間：2026-05-20T19:50:00+08:00。openclaw Pass 2 已完成、本檔已更新 Pass 2 結論。剩 Pass 2 spot check 跟 P0 修法實作明早可動。_
