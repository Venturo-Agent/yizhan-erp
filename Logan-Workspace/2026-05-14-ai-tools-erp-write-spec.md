---
created: 2026-05-14
status: draft / waiting_approval
owner: Logan
target_session: 等 William 5/14 早上拍板
related:
  - 2026-05-13-venturo-aierp-上線戰略地圖
  - 2026-05-13-會計上線圓桌會議
---

# AI 工具預留 spec — 開團 / 開訂單 / 建收款單

## 為什麼寫這份

William 2026-05-13 晚拍板「venturo / Slashboat 重新定位為 AI 整合平台」、一晚做完三通路 setup + 多通路 inbox + AI brain（commit `5e7827a` ~ `f52b0e3`）。

收尾時 William 補：

> 「我們可能要預留一些就是他可以建立 ERP 開團訂單的一些通路是 API 啦哪一集他可以見收款單的概念」

意思：**AI 之後要能 call ERP 寫操作**（建團 / 開訂單 / 建收款單）、現在不接、但路要先鋪好。

這份 spec 是路圖、不是實作清單。**未動任何 finance / orders / tours 寫入 code**、等 William 看完拍板再實作。

---

## 風險誠實盤點（為什麼不直接寫）

AI 自動寫 finance 路徑是高風險：

1. **金額亂寫風險**：AI 誤解客戶意圖、建錯金額的訂單 / 收款
2. **重複建單**：同一客戶問兩次、AI 建兩張訂單
3. **客戶身份混淆**：AI 把 A 客戶的問題建成 B 客戶的訂單
4. **無客戶確認**：客戶只是「問問」、AI 直接幫他開單
5. **無 agent 監督**：員工不知道 AI 偷偷建了什麼、月結時嚇到
6. **退款 / 撤銷複雜**：AI 建錯、要撤銷的話會動到既有 monthly close 邏輯

按 venturo CLAUDE.md「資安第一」紀律、AI 自動寫 finance 必須有：
- ✅ **Human-in-the-loop**（agent 點按鈕 confirm 才實際 commit）
- ✅ **Audit log**（actor 標明是 AI 建議 + 哪個 agent 確認）
- ✅ **金額上限**（單筆 NT$? 以上必員工 confirm）
- ✅ **客戶必綁定**（沒 customers row 不准建單）
- ✅ **可撤銷窗口**（建完 X 分鐘內可一鍵撤銷）

---

## 設計：兩階段 AI tool use

### Stage 0（now、人在前台手動）
- 既有 ERP UI（/tours / /orders / /finance）由員工手動操作
- AI 在 /messaging 只負責對話、**不寫 DB**
- AI 客服 brain 只 reply text、不 trigger actions

### Stage 1：AI 建議、agent 確認（**這份 spec 的範圍**）
- AI 對話中偵測到「客戶意圖建單」、回覆裡帶 intent metadata
- /messaging UI 偵測 metadata、顯示「💡 AI 建議：客戶想建這個訂單、點此確認」
- agent 點確認 → 跳轉到 /orders/new 或 /finance/.../new 預填好內容
- agent 在 ERP 既有 UI 確認 + 修改 + 送出
- **AI 從來不真寫 DB**、只是預填 UI

### Stage 2：AI 直接寫、agent 事後可撤銷（**未來、要 William 另外拍板**）
- AI tool use 直接 call API、寫進 DB（actor = AI bot employee）
- 5 分鐘 / 15 分鐘 窗口內 agent 可一鍵撤銷
- 超過金額閾值的、仍需 agent 預先 confirm

---

## Stage 1 實作 plan（waiting approval）

### 1. AI brain prompt 擴充

`src/lib/ai/ai-brain.ts` DEFAULT_SYSTEM_PROMPT 加：

```
意圖偵測：
- 客戶明確要開團 / 開訂單 / 付款 → 你的回覆**結尾**加 metadata marker：
  - [INTENT:CREATE_TOUR | confidence=high|medium|low | reason=...]
  - [INTENT:CREATE_ORDER | tour_code=? | participants=? | amount=? | confidence=...]
  - [INTENT:RECORD_RECEIPT | amount=? | from_customer=? | confidence=...]
- 客戶只是問問 / 不確定 → 不加 marker
- marker 不算對話內容、是給 agent 看的 metadata、客戶不會看到
```

### 2. /messaging UI metadata 解析

`src/app/(main)/messaging/page.tsx` 訊息 bubble 偵測 `[INTENT:...]` pattern：
- 訊息 content 拆兩段：對話文字（顯示給 agent 看）+ intent metadata（顯示為「AI 建議」卡片）
- 卡片有「✅ 確認、跳去建單」按鈕、跳轉到 ERP 既有 UI（含 URL 預填參數）

### 3. ERP 既有 UI 預填參數支援

各個建單 page 既有應有讀 URL search params 的能力、檢查 / 補：

- `/tours/new?suggested_name=...&suggested_destination=...` — 建團頁
- `/orders/new?tour_code=...&customer_phone=...&suggested_participants=...` — 訂單頁
- `/finance/payments/new?customer_id=...&suggested_amount=...&channel_ref=conv_id` — 收款頁

預填欄位 + 「來自 AI 對話 #convId」標記、讓 agent 知道資料源。

### 4. metadata 拆解 helper

`src/lib/ai/intent-parser.ts`（新檔）:
```ts
interface AiIntent {
  type: 'CREATE_TOUR' | 'CREATE_ORDER' | 'RECORD_RECEIPT'
  params: Record<string, string>
  confidence: 'high' | 'medium' | 'low'
}
function parseAiIntents(text: string): { cleanText: string, intents: AiIntent[] }
```

`cleanText` = 拿掉 marker 的乾淨對話、`intents` = 結構化建議。

### 5. /messaging UI 加 IntentCard 元件

```tsx
<IntentCard
  intent={intent}
  conversationId={conv.id}
  onConfirm={() => router.push(buildPrefillUrl(intent))}
  onIgnore={() => /* mark as ignored */}
/>
```

樣式：morandi-gold border、icon 對應 type（building for tour / cart for order / dollar for receipt）。

### 6. Audit trail

每次 agent 從 IntentCard 點「確認」、寫一條 audit log：
- actor = agent employee
- action = 'ai_intent_acted'
- ref_conversation_id = conv id
- ref_intent_type = ...
- 之後可以查「AI 建議的訂單轉化率」

---

## Stage 1 不做的（等 Stage 2）

- ❌ AI 直接寫 DB（Anthropic tool use API 接 supabase）
- ❌ 自動扣款 / 自動發 invoice
- ❌ 自動加客戶到客戶名單
- ❌ 跨對話 memory（「上次客戶說 5 人、這次說 7 人」AI 自動更新訂單）

這些都是 Stage 2 / Stage 3 的事、現在不要做。

---

## API 預留清單（既有 + 缺什麼）

### 既有可用（員工 UI 走的）

| 動作 | venturo 既有 API / 機制 |
|---|---|
| 建團 | `/tours/new` UI（client-side supabase insert）+ `/api/tours` 如果有 |
| 開訂單 | `/orders/new` UI、entity hooks 走 supabase 直 insert |
| 建收款 | `/finance/payments/new` UI、走 entity hooks |
| 建請款 | `/finance/requests/new` UI |
| 出納單 | `/finance/treasury/disbursement/new` UI |

**問題**：venturo 既有寫入路徑都是 **client-side supabase insert via entity hooks**、不是 server-side REST API。
意思：AI 要直接 call、需要走 **server-side admin client**（service_role）、繞 RLS。

### Stage 2 才會做的（server-side admin write）

- `POST /api/ai-tools/create-tour`（守 ai_tool.write capability、actor = AI bot）
- `POST /api/ai-tools/create-order`
- `POST /api/ai-tools/record-receipt`
- 全部走 admin client + audit log + 金額閾值守門

**現在不寫**：太敏感、需要 William 拍板閾值 / 確認流程 / 撤銷窗口設計後再動。

---

## 安全紅線（Stage 1 / Stage 2 都守）

按 CLAUDE.md 紅線 D「不准開作弊後門」：

| 紅線 | 範圍 |
|---|---|
| AI 不能改 closed period 的訂單 / 收款 | 走 `is_row_editable()` 守 |
| AI 建單必綁 customer_id | 沒綁定客戶 = reject |
| AI 操作必在 audit log（actor 標為 AI bot + reason） | 走 `recordApiAuditContext` |
| AI 金額 > NT$10,000 必 agent 預先 confirm | Stage 2 接 tool use 時加閾值守 |
| AI 不能繞過 RLS | 用 admin client 但寫 workspace_id + capability check |

---

## 未來實作順序（waiting approval）

按優先順序、每個都要 William 拍板：

1. **Stage 1.1** AI prompt + intent marker（簡單、低風險）
2. **Stage 1.2** /messaging UI IntentCard（中等、純 UI）
3. **Stage 1.3** ERP 既有 UI 預填參數（中等、改既有 page）
4. **Stage 1.4** Audit log for AI suggestions（簡單）
5. **Stage 2.1** AI tool use 接 Anthropic + create-tour endpoint（高、要拍板閾值）
6. **Stage 2.2** create-order endpoint
7. **Stage 2.3** record-receipt endpoint
8. **Stage 2.4** 撤銷窗口 / undo UI

---

## William 5/14 早上要拍板的

1. **Stage 1 整套要做嗎？**（AI 建議 + agent confirm 跳轉、不寫 DB）
2. **Stage 2 何時開始？**（AI 直接寫、要先設金額閾值 / 撤銷窗口）
3. **金額閾值**：超過 NT$ 多少必 agent 預先 confirm？
4. **撤銷窗口**：建完幾分鐘內可一鍵 undo？
5. **AI 操作的 actor**：用「FB-BOT-{ws}」「IG-BOT-{ws}」既有 bot employee、還是另建一個「AI-AGENT-{ws}」？

拍完我就照 spec 動。

---

## 紀念

這份 spec 在「沒拍板就不動 finance 寫入」紀律下寫的、避免：
- 半夜誤建單事故
- 客戶資料被 AI 污染
- 月結後 AI 偷改舊資料

明天 William 看完拍板、我再動。
