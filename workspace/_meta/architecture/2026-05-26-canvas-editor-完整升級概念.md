# Canvas 編輯器完整升級概念 — 拖拉式建站編輯器 + AI 整合 + 官網合一

> 撰寫：2026-05-26（資深前端架構師調研稿）
> 主題：把現有「展示行程 Canvas 編輯器」升級成「拖拉式建站編輯器 + AI 整合」、且跟 websites 官網模組合一。
> 性質：**升級概念文件 + 開源調研結論**、不含 code、不含 migration。給 William 拍板用。
>
> 業務白話：現在我們有一台「會排版行程提案的機器」、但它只能改幾個欄位、不能像積木一樣自由拖。
> 這份文件研究：要不要買現成的「積木拖拉引擎」來裝、還是繼續自己做、怎麼讓 AI 幫忙自動排積木。

---

## 0. TL;DR（給趕時間的人）

- **開源採用建議一句話**：**只借拖拉底層庫（`@dnd-kit`、MIT、薄層）、保留我們自己乾淨的 typed canvas JSON 跟純渲染 renderer、不整套換成 Puck / GrapesJS / Plasmic**。理由：我們已經有一套比這些框架更乾淨、更貼旅遊業務的地基、整套換會反被框架 schema 綁架（違反 venturo「薄抽象優於厚框架」原則）。
- **分階段路線**：**C（模板換裝填充）→ B（拖拉為主 + AI 側欄）→ A（AI 起草 + 拖拉微調）**、離現況最近的 C 先做、逐階加重 AI 跟拖拉。
- **最關鍵架構洞察**：展示行程 Canvas 跟 websites 官網**已經同源**（同 types / renderer / 編輯器組件）、差別只在「存哪 + 誰能看」。合一不是新工程、是「把現有共用層抽乾淨 + 補多租戶路由」。
- **要 William 拍板的頭號抉擇**：AI 要不要從「改 3 種既有文字」升級成「生 / 改 / 重排任意 block」——這是工程量分水嶺、也是 A/B/C 三方向的真正差異點。

---

## 1. 現狀盤點

### 1.1 Canvas 系統地基（很乾淨、是最大資產）

我們有一套**結構化的 typed canvas JSON + 純渲染 renderer**、不是「死 HTML 塞 contenteditable」那種爛攤子：

- **資料模型**（`src/components/canvas-renderer/types.ts`）：整份行程是一棵 `Canvas` 樹、`sections[]` 為頂層、`day` section 內再包 `blocks[]`。每個節點有 `type` 欄位（typed discriminated union）。
- **純渲染 renderer**（`src/components/canvas-renderer/CanvasRenderer.tsx`）：`switch(section.type)` / `switch(block.type)` 分流、**結尾有 `const _exhaustive: never` 檢查**——未來加新 block type、忘了補渲染分支、TypeScript 會直接紅線擋下。這是教科書等級的乾淨。
- **編輯方式**（`EditorPanel.tsx`）：右側 360px sticky panel、上半樹狀清單（點 section / block）、下半依 `selection.kind` 切換對應 block editor。**刻意不走 inline contenteditable**（檔頭註解寫得很清楚：inline 改 DOM 不回寫 JSON、雙向綁定要寫一堆 selection 處理、複雜度炸）。
- **編輯 helper SSOT**（`canvas-utils.ts`）：所有 mutate 集中、永遠回傳新物件（immutable、React 認得到變動）、不散在多處。

**業務白話**：我們的「行程提案機器」內部不是一團爛泥、是一盒分類清楚的積木（封面積木、每日積木、景點卡積木…）、每種積木都有自己的形狀定義、機器照形狀畫圖。這盒積木是我們最值錢的東西、**不能為了裝拖拉功能就把它砸了重買別人的積木**。

### 1.2 現有 15 種 block（都會渲染）

| #   | type                | 中文          | 層級          | 渲染 | 有編輯器 | AI 能動 |
| --- | ------------------- | ------------- | ------------- | ---- | -------- | ------- |
| 1   | `cover`             | 封面          | section       | ✅   | ✅       | ✅ 改文字 |
| 2   | `overview_timeline` | 行程總覽時間軸 | section       | ✅   | ❌       | ❌      |
| 3   | `day`               | 每日（容器）   | section       | ✅   | ❌       | ❌      |
| 4   | `day_header`        | 每日標題      | day block     | ✅   | ✅       | ✅ 改文字 |
| 5   | `route_card`        | 景點卡(4 版型) | day block     | ✅   | ✅       | ❌      |
| 6   | `sequence_steps`    | 時序步驟      | day block     | ✅   | ❌（唯讀）| ❌      |
| 7   | `hotel_card`        | 飯店卡        | day block     | ✅   | ❌（唯讀）| ❌      |
| 8   | `flight_card`       | 航班卡        | day block     | ✅   | ❌（唯讀）| ❌      |
| 9   | `restaurant_card`   | 餐廳卡        | day block     | ✅   | ❌（唯讀）| ❌      |
| 10  | `stays`             | 住宿總覽      | section       | ✅   | ❌       | ❌      |
| 11  | `feature_hero`      | 大圖英雄區     | day block     | ✅（minimal） | ❌（唯讀）| ❌  |
| 12  | `stall_grid`        | 小卡格        | day block     | ✅（inline）  | ❌（唯讀）| ❌  |
| 13  | `spotlight`         | 兩欄圖文      | day block     | ✅   | ✅       | ❌      |
| 14  | `jp_note`           | 日文註解      | day block     | ✅   | ✅       | ❌      |
| 15  | `appendix`          | 附錄          | section       | ✅   | ❌       | ✅ 改清單 |

### 1.3 三個缺口（這次升級要補的）

1. **編輯器覆蓋率只有 5/15**：只有 `cover` / `day_header` / `route_card` / `spotlight` / `jp_note` 有編輯表單。其餘 10 種點下去走 `ReadOnlyBlockEditor`、只能看跟刪、不能改。
2. **沒有「左組件庫拖到畫布」的拖拉機制**：現在加 block 靠右鍵 / 程式產生、不能像 Wix / Notion 那樣從左邊組件庫拖一塊到中央畫布。`websites/design` 那頁的「元件庫 / Canvas 預覽 / 屬性」三欄全是 skeleton 佔位文字（`Day 1 skeleton / Day 4 落地`）。
3. **AI 只會改 3 種既有文字、不能生新 block、不能重排**：`AiPatch.target` 只認 `cover` / `day_header` / `appendix` 三種（`canvas-utils.ts` 的 `AiSuggestion['target']` union 寫死）。AI 不能「生一個新的 spotlight」、不能「把 Day 3 的景點順序重排」、不能「整天行程從零生成」。

### 1.4 資料儲存（兩個地方、但同一種結構）

- **展示行程**：`tour_display_overrides` 表、草稿 `canvas` 欄 + `published_canvas` 快照欄。
- **官網**：`workspaces.canvas` 欄。

兩者**存的都是同一個 `Canvas` JSON 結構**。

### 1.5 websites 官網模組（5/23 半成品）

- 3 頁 skeleton 空殼：`/websites`（redirect 到 design）、`/websites/design`（拖拉編輯器佔位、全螢幕 `fixed inset-0 z-50` 三欄 layout）、`/websites/products`（產品上架佔位）。
- DB 已建：`subdomain` + `canvas` 欄位。
- **跟展示行程 Canvas 完全同源**：同 types / renderer / 編輯器組件。

### 1.6 同源洞察（這份文件的核心發現）

展示行程編輯器跟官網編輯器**不是兩個系統、是同一個系統的兩個出口**：

```
                  ┌────────────────────────────────────┐
                  │   Canvas Core（共用）               │
                  │   - types.ts（typed JSON 結構）     │
                  │   - CanvasRenderer（純渲染）        │
                  │   - block editors（編輯表單）       │
                  │   - canvas-utils（mutate helper）   │
                  └──────────────┬─────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                      │
    ┌─────────▼──────────┐              ┌────────────▼─────────┐
    │ 展示行程出口       │              │ 官網出口             │
    │ 存：tour_display_  │              │ 存：workspaces.canvas │
    │     overrides      │              │ 路由：subdomain       │
    │ 路由：/p/tour/[code]│             │ /websites/design 編輯 │
    └────────────────────┘              └──────────────────────┘
```

**這意味著**：補拖拉、補 AI、補 10 個缺編輯器——**做一次、兩邊都吃到**。合一不是「再做一套」、是「把已經共用的核心抽乾淨、加幾個行銷 block、補多租戶路由」。

---

## 2. 北極星願景

> 一句話：**一套拖拉式 Canvas 編輯器、展示行程跟官網共用、AI 直接生 block JSON（不是 raw HTML）。**

業務人（旅行社業務）的理想體驗：

1. 打開編輯器、左邊一排積木（封面 / 景點卡 / 飯店卡 / CTA / 價格表…）。
2. 從左邊**拖一塊積木到中央畫布**、放下、就出現在那個位置。
3. 點積木、右邊跳出**屬性表單**填內容（或上傳圖）。
4. 卡住不會寫文案？點「AI 助理」、跟它說「幫我這天寫個概述」或「幫我生一段東京美食的 spotlight」、**AI 直接吐出一塊符合格式的積木 / 改好的文字**、業務確認後套用。
5. 同一台編輯器、切到官網模式、拖的是行銷積木（價格表、見證、FAQ、CTA）、存到官網、用客戶的 subdomain 上線。

**關鍵技術前提（已收斂、不可動搖）**：

- AI 生 / 改的是 **Canvas block JSON**（typed union 內的合法結構）、**不是 raw HTML**。
- 這樣 AI 產出跟手動拖拉吃**同一套結構**、進同一個 renderer、走同一套 exhaustive 檢查、不會產生「AI 生的東西渲染器看不懂」的破口。
- 這正是 Puck 團隊在 2025/11 推出 Puck AI 時定調的「**Constrained UI vs AI Slop**」——AI 從預定義組件生 UI、不生任意 HTML、才能 production-ready。**我們的地基天生就是這個形狀**、只是還沒接上 AI。

---

## 3. 開源整備調研結論

### 3.1 對照表（2026-05 現狀）

| 引擎                 | React/Next App Router | 資料模型                            | License        | 維護活躍度                          | 給了多少（拖拉/組件庫/屬性面板）          | 整合風險（抽象層厚度）                                  | 適合採用模式             |
| -------------------- | --------------------- | ----------------------------------- | -------------- | ----------------------------------- | ----------------------------------------- | ------------------------------------------------------- | ------------------------ |
| **Puck** `@measured/puck` | ✅ 原生 React、有 App Router recipe | 自己的 `{content, root, zones}` JSON、需把我們 15 block 註冊成它的 config + field schema | **MIT** ✅      | v0.21.2（2026-04）、12.7k★、2010 commits、活躍 | **全給**：拖拉 + 左組件庫 + 右屬性面板 + viewport 預覽 + Puck AI（2025-11 beta、constrained UI 生成） | **中高**：要把現有 typed canvas 映射成 Puck config、renderer 改吃 Puck `<Render>`、我們的 exhaustive never 機制被它的 field schema 取代 | 整套（若願拋自有 renderer）或借設計理念 |
| **Craft.js**         | ✅ React、需自己搭 App Router | 自己的 nodes tree、要寫 `<Element>` 包裝每個組件 | **MIT** ✅      | 較 Puck 冷、setup 重、學習曲線陡       | **半給**：給拖拉 + node 樹引擎、UI（組件庫 / 屬性面板）要自己搭 | **中**：比 Puck 自由、但要自己組裝大量 UI、等於「半自建」 | 借底層、但比 dnd-kit 更綁 |
| **GrapesJS**         | ⚠️ 非 React-native（vanilla JS、有 `@grapesjs/react` v2 wrapper 支援 React 19 / Next 15） | **HTML/CSS 導向**（輸出 HTML 字串 + CSS、不是結構化 React props JSON） | BSD-3（核心免費、部分 plugin 商業） | 老牌、活躍、生態大                    | **全給但方向錯**：它是「做 HTML 網頁 / email」的、跟我們「typed React block」哲學衝突 | **高**：要把我們的 React block 塞進它的 HTML 世界、等於放棄 typed JSON 地基 | ❌ 不適合我們           |
| **dnd-kit** `@dnd-kit` | ✅ framework-agnostic core + React adapter | **無資料模型**（純拖拉引擎、不碰你的資料） | **MIT** ✅      | clauderic 維護、百萬週下載、新版 `@dnd-kit/abstract` + `/dom` + `/react` 重構中、活躍 | **只給拖拉**：`useDraggable` / `useDroppable` / sortable、組件庫 / 屬性面板 / 資料模型全自己來 | **薄（最低）**：只加一層拖拉手勢、完全不碰我們的 canvas JSON、撞牆隨時能 escape | ✅ **只借拖拉層（推薦）** |
| **Plasmic**（OSS 部分） | ✅ React | 自己的 project model、走 Plasmic Studio（雲端 / 可 self-host） | 部分開源、核心服務商業 | 企業導向、活躍                        | 全給但偏「設計師畫 → 生 React code」、不是「JSON 驅動 runtime」 | **高**：等於把編輯權交給 Plasmic Studio、跟我們 Supabase + 自有 renderer 架構脫節 | ❌ 過重、方向不合       |
| **Builder.io**（OSS SDK） | ✅ React/Next        | 自己的 headless CMS content JSON、編輯器在 Builder 雲端 | SDK 開源、編輯器/CMS 商業 SaaS | 活躍、有 Visual Copilot AI            | 編輯器全給但**綁雲端 SaaS**、自有 runtime 只拿到 SDK | **高 + 廠商鎖定**：核心編輯體驗在別人伺服器、多租戶資料要過 Builder | ❌ SaaS 鎖定、不合自託管 |

### 3.2 關鍵架構判斷（重點）

問題不是「哪個開源最強」、是「**採用開源會不會反而要拋棄我們這套乾淨地基、被框架 schema 綁架**」。

逐一檢視：

- **Puck**：是最接近、設計理念也最對（Puck AI 的 constrained UI 哲學跟我們不謀而合）。但採用 Puck = 把 `types.ts` 的 typed union 拆掉、重寫成 Puck 的 `config.components[].fields` schema、renderer 改吃 Puck `<Render data={...}>`。我們那個 `const _exhaustive: never` 的編譯期保護會**消失**（換成 Puck runtime 的 field 驗證）。**這是用「乾淨的編譯期型別安全」換「現成的拖拉 UI」**——以 venturo「資安第一、型別正確性」的優先序、這筆交易不划算。
- **GrapesJS**：哲學直接衝突（HTML 字串 vs typed React props）、採用 = 砸地基。排除。
- **Plasmic / Builder.io**：把編輯權 / 資料流交給別人的 Studio / 雲端、跟我們「Supabase 自託管 + 自有 renderer + 多租戶 RLS」架構脫節、且廠商鎖定。排除。
- **Craft.js**：比 Puck 自由、但 UI 全要自搭 = 「半自建」、那不如直接用更薄的 dnd-kit。
- **dnd-kit**：**只解我們真正缺的那一塊（拖拉手勢）**、完全不碰 canvas JSON。我們的 types / renderer / editors / utils 全部原封不動保留。撞牆能 escape（它只是一層 hook）。

### 3.3 明確採用建議

> **只借拖拉底層庫（`@dnd-kit`、MIT）、保留自有 typed canvas JSON + 純渲染 renderer + block editors + canvas-utils。不整套換成任何 visual editor 框架。**

**理由（對齊 venturo 8 維度 #7 抽象層原則）**：

1. **我們的地基比這些框架更乾淨、更貼業務**：typed discriminated union + exhaustive never check + immutable utils、是教科書等級。15 種 block 是針對精品旅遊提案長出來的、不是通用網頁元素。整套換 = 拿我們的金磚換別人的水泥。
2. **薄抽象優於厚框架**：dnd-kit 是「薄」（只加拖拉手勢、能 escape）；Puck/Plasmic/Builder 是「厚」（鎖死資料模型 / 編輯流程 / 雲端）。venturo 明文「厚框架撞牆難 escape、debug 沒救」。
3. **AI 整合反而更自由**：我們自己定義 AiPatch schema、想怎麼擴就怎麼擴（生 / 改 / 重排）、不受任何框架的 AI API 形狀限制。Puck AI 的 constrained UI 哲學**我們借「思路」即可、不必借「實作」**。
4. **多租戶 / RLS / 資安自己掌控**：canvas 存哪、誰能看、走哪條 RLS、全在我們 Supabase 手裡、不經第三方。

**唯一要引入的依賴**：`@dnd-kit/core` + `@dnd-kit/sortable`（或新版 `@dnd-kit/react`）、MIT、薄層。組件庫 UI、屬性面板、資料 mutate 全用既有自有 code 延伸。

> 譬喻：我們的積木盒（typed canvas）是訂製的、貼旅遊業務、分類完美。Puck 是「整套換成樂高的盒子 + 樂高的積木 + 樂高的說明書」——好用但要全部重買、而且以後只能玩樂高形狀。dnd-kit 是「給我們的訂製積木盒裝一雙會拖拉的手套」——手套是現成的、積木還是我們的。

---

## 4. 組件升級清單

### 4.1 既有 15 種 block 各自要補什麼

| block               | 補編輯器             | 補拖拉（可從組件庫拖入 / 可排序） | 補 AI 生成              |
| ------------------- | -------------------- | --------------------------------- | ----------------------- |
| `cover`             | ✅ 已有              | section 層、不參與 day 內拖拉      | ✅ 已有（subtitle）、可擴 title/eyebrow |
| `overview_timeline` | **補**（天數列表編輯）| section 層                        | **補**（依各 day 自動生總覽） |
| `day`               | **補**（day 容器設定）| section 層可重排（調整天數順序）   | —                       |
| `day_header`        | ✅ 已有              | day block 第一塊                  | ✅ 已有（summary）       |
| `route_card`        | ✅ 已有              | **補**（可拖入 / 排序 + 版型切換） | **補**（生景點描述 / highlights） |
| `sequence_steps`    | **補**（步驟增刪改） | **補**                            | **補**（依景點自動排時序） |
| `hotel_card`        | **補**（已有 HotelSelector、接上即可） | **補** | **補**（生飯店賣點描述） |
| `flight_card`       | **補**（航班欄位）   | **補**                            | —（事實資料、不該 AI 編） |
| `restaurant_card`   | **補**（已有 RestaurantSelector、接上） | **補** | **補**（生餐廳介紹） |
| `stays`             | **補**（住宿總覽彙整）| section 層                        | **補**（自動彙整各晚住宿） |
| `feature_hero`      | **補**（標題 / 背景圖）| **補**                          | **補**（生 hero 標語）   |
| `stall_grid`        | **補**（小卡增刪改） | **補**                            | **補**（生小卡描述）     |
| `spotlight`         | ✅ 已有              | **補**                            | **補**（生兩欄文案）     |
| `jp_note`           | ✅ 已有              | **補**                            | **補**（生日文用語解釋） |
| `appendix`          | **補**（清單編輯）   | section 層                        | ✅ 已有（inclusions/exclusions） |

**重點**：補編輯器是「填表單」工、補拖拉是「掛 dnd-kit + 加進組件庫清單」工、補 AI 是「擴 AiPatch target」工。三類工各自獨立、可分批。**已經有 `HotelSelector` / `RestaurantSelector` / `AttractionSelector` 等選擇器組件**（`src/components/editor/`）、補 hotel/restaurant/route 編輯器時可直接接上、不從零做。

### 4.2 官網要再補的行銷 block（新增 type）

官網跟行程提案的差別：行程是「給特定客人的提案」、官網是「給陌生訪客的行銷頁」。要補一批行銷導向的新 block type（都進同一個 `Canvas` 結構、同一個 renderer、同一套 exhaustive 檢查）：

| 新 block type    | 中文     | 用途                          |
| ---------------- | -------- | ----------------------------- |
| `cta_banner`     | 行動呼籲 | 「立即諮詢 / 報名」按鈕區塊    |
| `pricing_table`  | 價格表   | 方案 / 團費對比                |
| `testimonial`    | 客戶見證 | 旅客好評 / 評分                |
| `faq`            | 常見問答 | 摺疊式 Q&A                     |
| `contact_form`   | 聯絡表單 | 留資 / 詢價（接 leads）        |
| `gallery`        | 圖庫     | 旅遊照片牆                     |
| `team_intro`     | 團隊介紹 | 業務 / 導遊介紹                |
| `trust_badges`   | 信任標章 | 合法旅行社證號 / 保險 / 認證    |

**每加一個新 block type 必過 SOP**：
1. `types.ts` 加 interface + 進對應 union。
2. `CanvasRenderer.tsx` 加 `case`（exhaustive never 會逼你補）。
3. 寫對應 block editor（屬性表單）。
4. 進「組件庫」清單（拖拉來源）。
5. 若要 AI 生、擴 `AiPatch.target`。

---

## 5. AI 整合架構

### 5.1 現狀 AI 的天花板

現在 `AiSuggestion['target']` 是寫死的三選一 union：

```ts
target:
  | { type: 'cover'; field: 'subtitle' | 'title' }
  | { type: 'day_header'; block_id: string; day_index: number; field: 'summary' | 'title' }
  | { type: 'appendix'; field: 'inclusions' | 'exclusions' | 'notices' }
```

`applyAiPatch()` 只能把生成的「文字」塞回既有 block 的某個 field。**它的本質是「填空」、不是「造積木」也不是「重排積木」。**

### 5.2 升級後的 AiPatch schema（三種操作）

把「改 3 種文字」擴成「**生 / 改 / 重排任意 block**」、核心是把 AiPatch 從「填空指令」升級成「**Canvas 操作指令**」（patch operation）：

```ts
// 概念草案（非最終 code、給 William 看結構）
type AiOperation =
  // ① 改既有 block 的某個 field（現況的能力、保留）
  | { op: 'update_field'; block_id: string; field_path: string; value: string | string[] }
  // ② 生一個全新 block、插到指定位置
  | { op: 'insert_block'; day_index: number; after_block_id?: string; block: CanvasDayBlock }
  // ③ 重排某天的 blocks 順序
  | { op: 'reorder_blocks'; day_index: number; ordered_block_ids: string[] }
  // ④ 刪除 block（AI 建議精簡時）
  | { op: 'remove_block'; block_id: string }

interface AiPatch {
  id: string
  label: string          // 給業務看的人話「為 Day 3 生一個美食 spotlight」
  operation: AiOperation // 機器執行的指令
  preview: string        // review 步驟給業務看的摘要
}
```

**關鍵設計守則**：

1. **AI 永遠輸出合法的 typed block、不輸出 raw HTML**。後端拿到 AI 回應後、**先用 Zod（或等價）驗證符合 `CanvasDayBlock` union 才套用**、驗不過直接 reject。這是「constrained UI」的落地——AI 再怎麼亂、也只能在我們定義的積木形狀內生成。
2. **`applyAiPatch` 跟手動拖拉共用同一套 `canvas-utils` mutate 函式**。`insert_block` 走跟「從組件庫拖入」一樣的插入邏輯、`reorder_blocks` 走跟「拖拉排序」一樣的 reorder 邏輯。**AI 跟拖拉不是兩條路、是同一條路的兩個觸發源**。
3. **保留現有「分析 → 勾選 → 生成 → review → 套用」五步流程**（`AiAssistDialog.tsx` 已有）、只是 review 步驟從「看文字」擴成「看『要插一塊新積木 / 要重排』的預覽」。
4. **成本控制延續現況**：一次 API call 處理所有勾選項、`compressCanvasForAi()` 壓縮 context 給 AI 讀（省 token）。

### 5.3 AI 跟拖拉怎麼共用

```
業務手動拖拉 ──┐
                ├──→ canvas-utils mutate 函式（insertBlock / reorderBlocks / updateField）──→ 新 Canvas ──→ renderer 重畫
AI 生 patch  ──┘     （同一套、不分叉）
```

> 業務白話：不管是業務自己用手拖一塊積木、還是 AI 幫忙放一塊積木、最後都是「往同一個積木盒裡放積木」這個動作。我們只要把「放積木」這個動作寫好一次、手動跟 AI 都呼叫它。

---

## 6. 展示行程 + 官網合一架構

### 6.1 共用層 vs 差異層

合一的精髓：**99% 共用、差異只在「存哪 + 路由 + block 菜單」**。

| 層               | 展示行程            | 官網                | 共用？        |
| ---------------- | ------------------- | ------------------- | ------------- |
| Canvas types     | 同                  | 同                  | ✅ 共用        |
| Renderer         | 同                  | 同                  | ✅ 共用        |
| Block editors    | 同                  | 同                  | ✅ 共用        |
| canvas-utils     | 同                  | 同                  | ✅ 共用        |
| 拖拉引擎         | 同                  | 同                  | ✅ 共用        |
| AI 助理          | 同                  | 同                  | ✅ 共用        |
| **儲存位置**     | `tour_display_overrides.canvas` | `workspaces.canvas` | ❌ 差異   |
| **公開路由**     | `/p/tour/[code]`    | subdomain（客戶官網）| ❌ 差異        |
| **組件庫菜單**   | 行程 block 為主     | 行程 + 行銷 block    | ⚠️ 部分差異   |
| **權限 / RLS**   | tour 層             | workspace 層        | ❌ 差異        |

### 6.2 怎麼抽共用層（薄抽象）

把「存哪 / 載哪 / 組件庫菜單」抽成一個 **`CanvasEditorHost` 設定物件**注入、其餘全共用：

```ts
// 概念草案
interface CanvasEditorConfig {
  load: () => Promise<Canvas>                 // 從哪載草稿
  save: (canvas: Canvas) => Promise<void>     // 存回哪（apiMutate）
  publish?: (canvas: Canvas) => Promise<void> // 發布快照（行程有、官網有 subdomain）
  componentMenu: BlockType[]                  // 組件庫顯示哪些 block
  context: 'tour' | 'website'                 // 給 AI 提示用（語氣不同）
}
```

- 展示行程：`load/save` 打 `tour_display_overrides` API、`componentMenu` = 行程 block。
- 官網：`load/save` 打 `workspaces.canvas` API、`componentMenu` = 行程 + 行銷 block、`context: 'website'`。

**這是薄抽象**：差異被收進一個小 config 物件、核心編輯器組件完全不知道自己在編「行程」還是「官網」。撞牆能 escape（加第三種出口只要加一個 config、不動核心）。

### 6.3 多租戶 / 資安守門（對齊 venturo 紅線 H）

- 官網 `workspaces.canvas` 的讀寫 API：必走 `getCurrentWorkspaceId()`（從 session 取、不信 client）、RLS 過 `workspace_id = get_current_user_workspace()`。
- subdomain 公開頁是**唯讀 published 快照**、走 public API（類比現有 `/api/public/tour/[code]/display-canvas`）、不暴露草稿、不暴露跨租戶資料。
- 編輯權限走 capability（不是「admin only」）：`websites.design.write` 之類、進 `capabilities.ts` + `module-tabs.ts` + `features.ts` + seed（5 SSOT）。

---

## 7. 分階段落地路線（C → B → A）

> 原則：離現況最近的先做、每階段都是可上線的完整里程碑、不做「半個拖拉」這種卡中間的東西。

### 階段 C · 模板驅動 + AI 換裝填充（工程量：中小、離現況最近）

**目標**：業務選一個模板、AI 把資料填進去、少量手動微調。**不需要拖拉、不需要新框架。**

做什麼：
- 補齊 10 個缺的 block editor（填表單工、可分批、已有 selector 組件可接）。
- AiPatch 擴第一步：加 `insert_block`（AI 能生新 block、但插在固定位置、不重排）。
- 做 2-3 個「行程模板」（預設 Canvas JSON）、業務選模板 → AI 依 tour source data 填充。
- 官網開 `workspaces.canvas` 讀寫 API + 抽 `CanvasEditorConfig` 共用層第一版。

里程碑：**15 種 block 全可編輯、AI 能生新 block、官網能存能載。**

### 階段 B · 拖拉為主 + AI 側欄（工程量：中）

**目標**：經典建站體驗——左組件庫拖到中央畫布、右屬性面板、AI 當側邊助手。

做什麼：
- 引入 `@dnd-kit`、做「左組件庫拖入畫布 + day 內 block 排序」。
- `websites/design` 三欄 skeleton 落地（組件庫 / Canvas / 屬性）。
- AiPatch 擴第二步：加 `reorder_blocks` + `remove_block`（AI 能重排、精簡）。
- 補官網行銷 block（CTA / 價格表 / 見證 / FAQ…）。
- subdomain 公開頁路由 + published 快照。

里程碑：**完整拖拉建站、行程 + 官網共用一台編輯器、AI 能生/改/重排。**

### 階段 A · AI 起草 + 拖拉微調（工程量：大）

**目標**：對話生成優先（像 Framer AI / Puck AI）——業務打一句「幫我做東京六日精品團提案」、AI 生整份草稿、業務拖拉微調。

做什麼：
- AI 從零生成整份 Canvas（多 block、跨 day、自動編排）、走 streaming 預覽（像 Puck AI 的 UI stream following）。
- AI 對話式迭代（「Day 3 太擠、拆成兩天」「換個更精品的封面標語」）。
- 進階：AI 讀 tour source data + 客戶偏好、自動選模板 + 填充 + 排版一條龍。

里程碑：**對話起草整份提案 / 官網、拖拉只用來微調。**

> 為什麼這個順序：C 用既有架構就能做（補編輯器 + 小幅擴 AI）、馬上有產出；B 加拖拉引擎（薄層）；A 才是重工程（streaming 生成 / 對話迭代 / 整份草稿）。每階段都建立在前一階段的共用層上、不返工。

---

## 8. 風險與抉擇點（要 William 拍板）

### 抉擇 ①（頭號）：AI 要做到哪一階？

- C 的 AI（生新 block、固定位置）工程量小、馬上能用。
- A 的 AI（對話起草整份、streaming）工程量大、是「Framer AI 等級」的投入。
- **拍板問題**：先停在 C/B 的 AI（生 + 重排既有結構）、還是一路衝到 A（對話起草整份）？這決定總工程量級別。

### 抉擇 ②：確認「只借 dnd-kit、不整套換 Puck」這個方向

- 本文強烈建議只借 dnd-kit。但 Puck AI 的 constrained-UI 生成是現成的、若團隊想「少寫 AI 整合 code」、可重新評估「採用 Puck 但保留我們的 block 概念映射」。
- **拍板問題**：接受「保留自有地基 + 借薄拖拉層」的多寫一點 code、換取不被框架綁架？（架構師立場：接受、對齊 venturo 薄抽象原則。）

### 抉擇 ③：官網行銷 block 的範圍

- 第 4.2 列了 8 種行銷 block。全做還是先做關鍵 3-4 種（CTA / 價格表 / 見證 / FAQ）、其餘 v2？
- **拍板問題**：官網 v1 要多「完整」？（建議：對齊 venturo「v1 做關鍵 1-2 個入口、其他 v2」、先做 CTA + 價格表 + 見證 + FAQ。）

### 抉擇 ④：subdomain 多租戶上線方式

- 官網要對外、走客戶 subdomain。涉及 DNS / Coolify 路由 / SSL 萬用憑證——這塊跟現有 erp.venturo.tw 部署不同。
- **拍板問題**：subdomain 官網的 hosting 方案要不要這輪一起設計、還是 Canvas 編輯器先做、subdomain 發布 v2？

### 抉擇 ⑤：AI 後端驗證的嚴格度

- AI 生 block 必過 Zod 驗證才套用（防 AI slop）。要不要連 RLS / 業務規則也在套用前驗（譬如 AI 不能生跨租戶資料）？
- **拍板問題**：驗證層做到「結構合法」即可、還是要做到「業務合規」？（建議：結構合法在 client 驗、業務合規在 API 層驗、雙層。）

### 通用風險

- **不要中途引入厚框架**：一旦 B 階段為了省事換成 Puck/Plasmic、後面 A 階段的自訂 AI 就會被框架 AI API 形狀卡住。守住「薄抽象」。
- **exhaustive never 是資產、別弄丟**：每加新 block type、靠 `const _exhaustive: never` 在編譯期逼補渲染分支。引入任何框架前確認這個保護還在。
- **共用層別過度抽象**：`CanvasEditorConfig` 只收「真正會變的差異」（存哪 / 路由 / 菜單）、不要為了「未來可能有第三種出口」先抽一堆 generic（對齊 venturo「三個重複才抽」）。

---

## 附錄：調研來源

- Puck `@measured/puck` — [GitHub puckeditor/puck](https://github.com/puckeditor/puck)（v0.21.2、2026-04、12.7k★、MIT）、[Puck Data Model docs](https://puckeditor.com/docs/api-reference/data-model/data)、[Puck blog（Puck AI / constrained UI）](https://puckeditor.com/blog)
- Craft.js — [craft.js.org](https://craft.js.org/)、[Top 5 Page Builders for React 2026](https://dev.to/fede_bonel_tozzi/top-5-page-builders-for-react-190g)
- GrapesJS — [GrapesJS + React + Next.js 整合指南](https://gjs.market/blogs/integrating-grapesjs-into-a-nextjs-13-app-with-the-grapesjsr)
- dnd-kit — [dndkit.com](https://dndkit.com/)、[clauderic/dnd-kit LICENSE（MIT）](https://github.com/clauderic/dnd-kit/blob/master/LICENSE)、[維護狀態 issue #1830](https://github.com/clauderic/dnd-kit/issues/1830)
- Plasmic / Builder.io — [Plasmic vs Builder.io](https://www.plasmic.app/vs-builder-io)、[Builder vs Plasmic vs Makeswift 2026](https://www.pkgpulse.com/blog/builder-io-vs-plasmic-vs-makeswift-visual-page-builders-2026)
