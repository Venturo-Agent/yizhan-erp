---
created: 2026-05-14
status: draft / waiting_william_approval
owner: Logan
supersedes: 2026-05-14-ai-tools-erp-write-spec.md
related:
  - 2026-05-13-venturo-aierp-上線戰略地圖
  - venturo channels 系統（既有員工通知通道）
  - venturo /tours proposal status（既有）
---

# AI 整合平台 v2 spec — 整合 William 三階段 + 6 soul 圓桌結論

## TL;DR

**強烈推薦：方案 B「AI 半自動建單、員工把關」**
- 工程量 ~120 hr（3 週全力衝）
- 6 soul 圓桌一致共識（PM / 業務 / 老闆三方都選 B）
- 對齊 venturo ICP（中型旅行社 5-15 人）
- 對齊 William 三階段（付費 gating / 開團自動化 / 需求追蹤）

**還剩 3 個衝突點要 William 拍板**：
1. C1 收款連結誰發（推薦員工親自貼）
2. C4 AI 估價是否顯示在 proposal 卡片（推薦顯示但 🔴 標待確認）
3. C7 AI 是否主動自我介紹「我是 AI 助理」（推薦明說、品牌定位更高級）

---

## 背景：怎麼來到這份 spec

- **2026-05-13 晚**：William 拍板 venturo 重新定位 AI 整合平台、一晚做完三通路 setup + 多通路 inbox + AI brain（commit `5e7827a` ~ `f52b0e3`）
- **2026-05-13 21:18**：William 提「預留 ERP 開團 / 訂單 / 收款 API」、我寫 spec v1
- **2026-05-13 21:24**：William 拋三階段思路（付費 gating / 開團自動化 / 需求追蹤）、建議找圓桌討論
- **2026-05-13 21:30+**：派 subagent 跑 6 soul 圓桌（PM / 業務 / 老闆 / 會計 / AI / 客戶）、結果整合進這份 v2

---

## William 三階段（5/13 21:24 拋的）對齊圓桌結論

### 階段 1：付費功能權限

**William 講**：「AI 功能並非所有租戶都能使用、必須是付費租戶才有」。

**圓桌沒衝突、技術已備**：
- venturo 既有 `workspace_features` 表已有 gating 機制
- 既有 features：`facebook_bot` / `instagram_bot` / `line_bot` 三個 premium
- **建議加 umbrella feature `ai_integration`**：賣整套（三通路 + AI brain + 機器人開團）、月費 NT$3000 對應這個 umbrella
- 漫途自己 workspace：開 `ai_integration=true` 自然有
- 試用客戶：platform admin 在 /workspaces 開通

**工程量**：~2 hr（加 module + codegen + seed migration）

---

### 階段 2：開團自動化整合

**William 講**：「員工上線在頁面上能看到待辦事項、或透過特定功能手動轉開團」、提兩個 sub-option：
- (a) 完整自動化（含自動收錢）
- (b) /tours 加「機器人開團」分頁

**圓桌結論：(b) + 部分 (a)**

具體流程：

```
[1] 客戶 IG/LINE/FB 私訊 → AI 對話、抽結構化欄位
    ↓
[2] AI 偵測「客戶明確想開團」+ 信心 🟢 高 → 自動建 tours.status='proposal'
    ↓                                              ↓
    AI 信心 🟡 中 → 建 proposal、標「員工驗證價格」
    AI 信心 🔴 低 → 不建 proposal、丟「需人工介入」清單
    ↓
[3] 員工進 /tours?tab=機器人開團、看 proposal 卡片
    ↓
[4] 員工點「確認開團」→ status='open'
    ↓
[5] ERP 自動產 /p/tour/[code] 公開頁連結
    ↓
[6] 系統跳 toast「連結準備好了、要不要發給客戶？」
    ↓ 員工點「複製到剪貼簿」
[7] 員工在 IG/LINE/FB 親自貼連結給客戶（用業務員自己的話術）
    ↓
[8] 客戶從連結進 /p/tour 公開頁、刷卡 / 匯款（既有 flow）
    ↓
[9] 收款進 ERP /finance/payments、走既有對帳 / 會計 flow
```

**為什麼不走 (a) 完整自動化（C 方案）**：
- 會計強烈反對：「AI 不准碰我的傳票 / payment_request / receipt」
- 業務專員：「AI 發連結出錯我背鍋、不接受」
- 客戶：「AI 丟連結我覺得被推銷、會封鎖」
- 老闆：「員工至少要按一個按鈕、出事我才能追責」

**「機器人開團」分頁卡片設計**（圓桌共識）：

```
┌─────────────────────────────────────────────────────────────────┐
│ 全部 │ 未出發 │ 提案 │ 🤖 機器人開團 (8) │ 範本                  │
└─────────────────────────────────────────────────────────────────┘
  今日 AI 接案：🟢 5 高信心 / 🟡 2 中 / 🔴 1 低     [全部展開 ▼]

┌─────────────────────────────────────────────────────────────────┐
│ 🟢 #B-2026-0513-001        IG 私訊 · Amy_28              ⏱ 2h 前│
│ ────────────────────────────────────────────────────────────── │
│ 客戶原話：「我們 4 個人 8/15 想去日本玩 5 天有什麼推薦？」      │
│ AI 抽到：4 人 · 8/15 出發 · 5 天 · 日本 · 預算未提              │
│                                                                  │
│ 🎯 AI 建議：日本關西 5 天 · 建議價 NT$28,000/人                  │
│   🔴 估價待員工確認（機票價格 AI 信心低）                       │
│                                                                  │
│              [檢視對話] [修改後確認] [✓ 確認開團] [✗ 撤銷]      │
└─────────────────────────────────────────────────────────────────┘
```

設計要點（圓桌共識、不要妥協）：
- **客戶原話完整保留**（業務 Sandy 強烈要求、別讓 AI 改寫）
- AI 信心三檔 🟢🟡🔴（不用 0.87 這種數字、員工看不懂）
- AI 估價標 🔴 待確認（AI 自承估價可能差 30%、特別是機票旺季）
- 撤銷必須二次確認 + 填原因（撤銷率 > 20% 老闆要查）

**工程量**：
- AI prompt 加 intent 抽取 + 升級成 proposal：~20 hr
- /tours 機器人分頁 + 卡片 UI + drawer 確認：~40 hr
- proposal → open 流程 + 連結產生 + toast：~20 hr
- 撤銷流程 + audit trail：~15 hr
- 小計 **~95 hr**

---

### 階段 3：需求追蹤與人工介入

**William 講**：「達到完全自動化之前、若需要真人回覆、系統應先將其轉為『提案』、再透過頻道通知相關人員」。

**圓桌結論**：拆兩個概念、不要混

#### 3A. 意圖分級（AI 內部判斷）

每段對話 AI 內部標 intent：
- 閒聊（say hi、無業務需求）
- 詢問（問問題、不一定要訂）
- 想開團（明確需求、條件齊）
- 想開團但複雜（條件不齊、AI 不確定）
- 客訴 / 退費（AI 必 escalate、不准回）

#### 3B. 處理對應

| Intent | 處理 | 通知 |
|---|---|---|
| 閒聊 | AI 回、留在 /messaging | 無 |
| 詢問 | AI 回 + 抽部分欄位（給員工後續參考） | 無 |
| 想開團（齊）| AI 建 proposal 進 /tours 機器人分頁 | 員工進 ERP 自然看到 |
| 想開團（複雜）| AI 不建 proposal、對話標「🚨 需人工介入」 | venturo channels 系統發訊到「業務組」channel |
| 客訴 / 退費 | AI 不回、對話標「🚨 客訴」 | channels 發到「客服組」channel + email 給主管 |

#### 3C. 通知通道（重用既有 venturo channels）

- 員工進 /channels 看到「需人工介入」清單（既有 channels 系統 加 system bot 發訊）
- 訊息格式：「🚨 5h 前進來、客戶說想包團 50 萬、誰接手？[去對話]」
- 員工點「我接」→ 對話 bot_paused=true、AI 退場、業務員自己跟客戶聊

**工程量**：
- AI intent 分級 prompt + 結構化輸出：~10 hr
- /messaging 對話標籤 + 「需人工介入」清單：~15 hr
- venturo channels 系統 bot 發訊整合：~10 hr
- 員工「我接」按鈕 + bot_paused 切換：~5 hr
- 小計 **~40 hr**

---

## 三階段總工程量

| 階段 | 範圍 | 工程量 |
|---|---|---|
| 1. 付費 gating | `ai_integration` umbrella feature | ~2 hr |
| 2. 開團自動化 | proposal 建 + 機器人分頁 + 員工確認 | ~95 hr |
| 3. 需求追蹤 | intent 分級 + channel 通知 + 人工介入 | ~40 hr |
| **總計** | | **~137 hr** |

3 週全力衝（每天 8 hr * 17 天 ≈ 136 hr）= 上線時間 **2026-06-04 左右**。

---

## 圓桌共識（不要再 debate、直接做）

| 議題 | 共識 |
|---|---|
| AI 主動程度 | 方案 B（半自動建 proposal、員工把關） |
| 信心分數呈現 | 三檔 emoji 🟢🟡🔴、不用數字 |
| 客戶原話保留 | 完整保留、不要 AI 改寫成「客戶詢問日本團」 |
| 撤銷 proposal | 強制寫原因 + 二次確認 |
| 對話冷掉處理 | archive 不刪（會計合規硬需求） |
| AI 估價 | 顯示但 🔴 標待員工確認、機票旺季信心低自承 |
| 退費 / 取消 | 走既有 ERP /finance flow、AI 不准簡化 |
| Ghost 客戶 | 員工點按鈕才能 AI 勾、不自動 spam（業務 + 客戶反對 spam） |
| AI 操作 actor | 用既有 FB-BOT-{ws} / IG-BOT-{ws} / LINE-BOT、不另建 |
| 月結後撤銷 | 不准回頭改、走當期沖正（紅線 D） |

---

## 剩下 3 個衝突點（William 拍板）

### C1：收款連結誰發給客戶

**選項 A**：員工確認後、系統自動發給客戶（用 AI bot 帳號 / 用 page）
- 立場：PM、老闆
- 理由：效率高、conversion funnel 短

**選項 B**：員工親自貼連結（用業務員自己的 LINE / IG 帳號）⭐ Logan 推薦
- 立場：業務員 Sandy、客戶 Amy
- 理由：客戶信任業務員、不信任機器人；AI 發連結客戶會封鎖；業務員建立客戶關係
- 工程：toast「連結準備好了、複製到剪貼簿」、員工自己貼

### C4：AI 估價是否顯示在 proposal 卡片

**選項 A**：顯示 AI 估價（決策依據）
- 立場：PM
- 理由：員工有數字參考、不用從頭算

**選項 B**：不顯示、留空白讓員工自己填
- 立場：AI agent 自承
- 理由：AI 估機票價可能差 30%、員工看了會依賴

**選項 C**（折衷、Logan 推薦）：顯示 + 標 🔴「估價待員工確認」
- 給員工參考但不依賴
- 員工有義務驗證、UI 不讓「不確認價格」按下確認

### C7：AI 是否主動自我介紹「我是 AI 助理」

**選項 A**：自我介紹（「您好我是 venturo AI 助理...」）
- 立場：客戶 Amy
- 理由：透明告知避免被當詐騙、品牌「AI + 真人」更高級
- 風險：客戶知道是 AI、可能不認真打字、conversion funnel 短

**選項 B**：不自我介紹、AI 直接當業務員回
- 立場：業務員、老闆
- 理由：客戶以為是真人、回得更認真、轉化率高
- 風險：客戶事後發現是 AI、信任崩潰、品牌傷害

**Logan 推薦選項 A**：話術設計「您好、我是 venturo 旅遊小幫手（AI 助理）、有任何問題我先協助您、需要時會請真人專員接手」— 既透明又留 fallback 預期。

---

## 紅線（必守、不可妥協）

按 venturo CLAUDE.md：

1. **沒有超級管理員**：AI 不准 hardcode 特權、走 capability gate
2. **AI 不准碰 closed period 的訂單 / 收款**（紅線 D 作弊後門）
3. **AI 建單必綁 customer_id**：沒綁定客戶 = reject
4. **AI 操作必進 audit log**（actor = AI bot + reason = 'ai_auto_proposal'）
5. **金額 > NT$10,000 員工預先 confirm**（不能 AI 自動）
6. **撤銷窗口 15 分鐘**（建完 15 分鐘內可一鍵 undo、超過走既有沖正）

---

## 實作順序（William 拍板後）

```
Week 1: Stage 1 + 3A.intent 分級
  - Day 1-2: ai_integration umbrella feature + workspace_features seed
  - Day 3-4: AI prompt 升級（intent 分級 + 結構化輸出）
  - Day 5: e2e 測試三通路 intent 抽取

Week 2: Stage 2 機器人開團（核心）
  - Day 1-3: AI proposal 建立 logic + tours.status='proposal' + AI bot employee 標
  - Day 4-5: /tours?tab=機器人開團 UI + 卡片 + drawer 確認

Week 3: Stage 2 收尾 + Stage 3 通知
  - Day 1-2: 員工確認 → status='open' → 連結 + toast 流程
  - Day 3: 撤銷流程 + audit trail
  - Day 4: venturo channels 系統「需人工介入」通知整合
  - Day 5: e2e 測試 + 試用客戶 staging
```

---

## William 早上拍板清單

請拍板：

1. **方案 A / B / C 選哪個？**（Logan 強烈推薦 B、圓桌一致同意）
2. **C1 連結誰發**：員工親自貼 vs 系統自動發？
3. **C4 AI 估價是否顯示**：顯示 / 隱藏 / 顯示但 🔴 標待確認？
4. **C7 AI 自我介紹**：明說 vs 假裝真人？
5. **三階段啟動時間**：立刻開做 / 等試用客戶簽約再做 / 8/13 第一個付費客戶之後再做？

拍完我照這份 spec 動工、~3 週可上線 MVP。
