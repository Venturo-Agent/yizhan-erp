# Entry Points 全方位深度盤點 — 2026-05-22

> William 拍板：用「請款 entry points 對照」方法、複製到 6 個方向。
> 目的：找出 user 找不到的功能 + 設計不對稱的地方、6/1 前修。

---

## 🥇 1. 收款 entry points

### 已實作

| Entry Point | 證據 | 業務情境 |
|---|---|---|
| `/finance/payments` | 主 page primaryAction | 主入口（所有情境通用）|
| `tours/_components/tour-receipts.tsx` | 團體頁收款 tab | 看 / 開該團收款 |
| `orders/_components/OrderListView.tsx` | 訂單列表「收款」按鈕 | 對該訂單收款 |
| `todos/quick-actions/quick-receipt.tsx` | 待辦快捷 | 一鍵收款 |
| `BatchReceiptDialog.tsx` | 批次收款 dialog | 一次處理多筆 |
| `ReceiptTransferDialog.tsx` | 已 confirmed 收款內 | 轉移至別團 |

### ❌ 缺

| 缺什麼 | 業務影響 |
|---|---|
| **客戶頁「收款」快捷** | 客戶來付錢、要先進 finance 找訂單、流程斷 |
| **dashboard quick action** | 沒「+ 收款」入口、user 多 click |
| **行事曆「收款日期到了提醒」**| 沒主動提醒收款日 |

### 對稱性檢查（vs 請款）

| 請款 | 收款 | 對稱？ |
|---|---|---|
| `/finance/requests` 主入口 | `/finance/payments` 主入口 | ✅ |
| 訂單列表「請款」按鈕 | 訂單列表「收款」按鈕 | ✅ |
| 旅遊團 → 成本頁 | 旅遊團 → 收款頁 | ✅ |
| 成本轉移 | 收款轉移 | ✅（都藏 dialog 內、5/22 確認）|
| 從薪資 wizard 自動產 | 無對應 | ⚠️（合理、收款不從 HR）|

**結論**：對稱性大致完整。主要缺「客戶頁快捷」+「dashboard quick action」。

---

## 🥈 2. 客戶 entry points

### 已實作

| Entry Point | 證據 |
|---|---|
| `/library/customers` 主入口 | primaryAction「新增客戶」按鈕 |

**只有 1 個入口！**

### ❌ 缺（嚴重）

| 缺什麼 | 業務影響 |
|---|---|
| **訂單頁開單時無「快速建客戶」** | 業務開單前必須先回客戶頁建檔、流程斷裂、跳頁 |
| **團員列表無「快速建客戶」** | 加團員要先建客戶、同樣斷裂 |
| **LINE@ 對話進來無自動建客戶提示** | 客戶 LINE 進來、要手動 link |
| **dashboard 無 quick action** | 沒「+ 客戶」入口 |
| **行銷活動報名無自動建客戶** | 行銷頁 lead 進來、無自動 sync |

### 真實案例（user 痛點）

業務員想開單給新客戶：
1. 切到 `/library/customers` 建客戶
2. 切到 `/orders` 開單
3. 選剛建的客戶
4. **3 個跳頁、每次都這樣**

**建議**：訂單頁 `客戶下拉` 加「+ 新增」inline option（在下拉內可即時建客戶）。

---

## 🥉 3. 旅遊團 entry points

### 已實作

| Entry Point | 證據 |
|---|---|
| `/tours` 主入口 | ToursPage 有「新增旅遊團」按鈕 |
| ⚠️ 守門：必先設銀行帳戶才能建團 | `ToursPage.tsx:287` |

**只有 1 個入口！**

### ❌ 缺

| 缺什麼 | 業務影響 |
|---|---|
| **行銷活動轉團** | 行銷拿到 lead、無「直接開新團」按鈕 |
| **客戶詢問轉團** | 客戶 LINE 問「下次去日本何時」、無「快速建新團」 |
| **從範本複製** | 同樣的日本團每次重新建檔、無「從上次團複製」 |
| **dashboard quick action** | 無 |

### 守門可優化

**「先設銀行帳戶」guard 對 user 不友善**：
- 新公司剛開帳號、還沒設銀行、想試開新團 → 卡住
- 建議：改成 warning（提醒未來要設、但不擋）

---

## 4️⃣ 結團 / 月結閉環

### 結團入口

⚠️ grep 「結團」找不到明顯按鈕、可能藏在 tour 詳情頁某個 sub tab。
**問題**：結團是月結前置動作、找不到 entry 表示 UX 失敗。

### 月結入口

| Entry Point | 證據 |
|---|---|
| `/accounting/period-closing` | sidebar 「會計 → 期末結轉」 |
| ⚠️ 結團 → 月結 沒自動連動 | 兩個獨立流程 |

### 完整閉環檢查

| 步驟 | 入口 | 狀態 |
|---|---|---|
| 1. 結團 | 藏在 tour 詳情 | ⚠️ 入口不明顯 |
| 2. 結團對帳（請款 / 收款補做完）| 結團 wizard 內？ | 待確認 |
| 3. 月結 | `/accounting/period-closing` | ✅ |
| 4. 月結後鎖定 | 系統自動 | ✅ |
| 5. 損益表 / 試算表 | `/accounting/reports` | ✅ |

### ❌ 缺

| 缺什麼 | 業務影響 |
|---|---|
| **月底 dashboard 提醒** | 「還有 X 團未結、不能月結」沒主動提示 |
| **結團前 checklist 提醒** | 「請款 / 收款都做完了嗎」沒提醒 |
| **月結阻擋說明** | 月結失敗時、不告訴 user 哪幾團還未結 |

---

## 5️⃣ Sidebar 結構審視

### 現況

**Sidebar 顯示**：16 個 module
```
1. dashboard
2. calendar
3. todos
4. channels
5. ai_hub  ← 第 5 位（HAPPY 開發重點）
6. tours
7. orders
8. finance（含 5 子）
9. accounting（含 5 子）
10. documents
11. database
12. marketing
13. hr
14. workspaces
15. shared_data_management
16. platform_integrations
```

**ALL_MODULES 共 34 個** → **18 個沒在 sidebar**：
- customers（在 library/ 子目錄下）
- visas / esim
- tour_attributes
- addon_data_attractions / hotels / restaurants
- hr_salary_settlement / hr_bonus_settlement（沒獨立 sidebar 入口？）
- 等等

### 問題 1：客戶頁不在 sidebar

`/library/customers` — 客戶管理藏在 「**database 圖書館**」icon 下、user 直覺找不到。

**業務優先級看**：客戶 = 業務每天用、應該 sidebar 第 4-5 位。

### 問題 2：HR 排序偏後

HR 在第 13 位、但 HR 是每月例行任務（薪資 / 獎金 / 員工管理）。
**建議**：排到第 8-10 位。

### 問題 3：ai_hub 第 5 位 vs 業務常用度

ai_hub 第 5 位很顯眼、但目前 HAPPY 還在 testing。
業務 SOP 順位：tours / orders / customers / finance 應該都比 ai_hub 前。

### 建議重排序

```
1. dashboard
2. calendar       ← 看當天行程
3. todos          ← 看待辦
4. customers      ← 新加（從 library 移上來）
5. tours          ← 旅遊團
6. orders         ← 訂單
7. finance        ← 財務
8. accounting     ← 會計
9. hr             ← 上移
10. channels      ← 內部對話
11. ai_hub        ← 下移、testing 完再前推
12. marketing
13. documents / database / workspaces ← 後段
```

---

## 6️⃣ 「user 找不到功能」高風險點掃描

### 🔴 P0（嚴重、user 100% 找不到）

| # | 功能 | 藏在哪 | 業務影響 |
|---|---|---|---|
| 1 | **客戶管理** | `/library/customers`、sidebar 沒直接顯示 | 業務每天用、找半天 |
| 2 | **退款** | 沒專屬 UI、要會「開負金額收款」技巧 | 客戶取消團、會計搞不清楚 |
| 3 | **結團** | 藏 tour 詳情某 sub tab | 操作員每月忘記 |
| 4 | **VISAS / ESIM** | 不在 sidebar、不知道有此功能 | 簽證 module 廢用 |

### 🟡 P1（中、user 30-50% 找不到）

| # | 功能 | 藏在哪 |
|---|---|---|
| 5 | **收款轉移 / 成本轉移** | dialog 內、要先開單才看到（user 用得少、5/22 William 拍板不放外面）|
| 6 | **HR 薪資結算 wizard** | sidebar HR 子目錄、HR 排序 13 位偏後 |
| 7 | **行銷活動** | marketing 在 sidebar 第 12 位 |
| 8 | **批次收款** | dialog 內、user 不知 |

### 🟢 P2（輕微）

| # | 功能 | 藏在哪 |
|---|---|---|
| 9 | **手續費自動產請款** | 收款核准後自動跑、user 不知 |
| 10 | **印請款單 / 出帳單** | 列印按鈕在 row action 內 |

---

## 📊 總結 + 建議優先級

### 🔴 6/1 前必修（user 痛點）

1. **客戶頁從 library 移到 sidebar 主入口**（5 分鐘）
2. **VISAS / ESIM 加入 sidebar 或明確凍住**（10 分鐘）
3. **退款 user-guide 已補**（5/22 已做）
4. **結團入口明確化**（譬如 tour 詳情頁顯眼按鈕、30 分鐘）

### 🟡 6/1 後排程

5. **訂單下拉「+ 新增客戶」inline**（1 小時）
6. **dashboard quick actions**（+ 收款 / + 客戶 / + 團）（30 分鐘）
7. **HR sidebar 上移**（5 分鐘）
8. **行事曆收款日提醒**（1 小時）

### 🟢 Phase 2

9. **行銷 lead → 自動建客戶**
10. **結團 wizard checklist 提醒**
11. **「從上次團複製」功能**

---

## ⚠️ 對 HAPPY 知識庫的更新建議

把這份報告的「entry points 真實位置」補進 user-guide：
- 在 `01-how-to-payment-request.md` 補「9 個入口」清單
- 在新建的 `04-how-to-receive-payment.md` 補「6 個收款入口」清單
- 加新檔 `10-where-to-find-features.md`（功能藏哪裡 cheat sheet）

這樣 HAPPY 就能答「我從哪裡找 X」。

---

*建立：2026-05-22 by Claude Opus（接 William「全動研究一下」指令）*
