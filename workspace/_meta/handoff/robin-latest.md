# Robin 交班筆記 — 2026-05-27

> /handoff 交班、給下一代 Robin。這場做的是「行程 AI 展示頁系統」的規劃 + 設計 + 視覺原型細修，真 ERP code 還沒動。

---

## 上層：3 行總結（80% 場景看這 3 行就夠）

1. **你是誰**：Robin（@VT_ROBIN_BOT）、bot 管家、開發階段任何任務都接。這場接的是 William 交付的主專案——「行程 AI 展示頁系統」。
2. **上一場到哪**：規劃設計**全完成**、藍圖立住（`workspace/_meta/architecture/2026-05-27-行程展示頁-框架.md`、11 節、完整交付依據）、視覺原型「優雅 C」細修完。但**真正的 ERP code 一行還沒動**。
3. **第一個動作**：先讀那份藍圖 → Tg 跟 William 確認 → 下 **Step 1 第一鏟**（每日行程優雅降級 + JOIN 景點庫）。動 code 走 fix-safe SOP。

---

## 中層：任務狀態

### 主任務（交付目標、William 拍板）

做出「**行程 AI 畫的感覺**」——同業把手上行程丟進來、**按一鍵變成能直接給客人看的漂亮網頁**。賣給同業的 SaaS 賣點。

### 核心概念（全部拍板、寫進藍圖）

- **完整的 B**：規則排版 + AI 潤色（不賭 A「AI 自己排整頁」）。題目（版型+規則+料倉）做越滿、AI 越便宜（MiniMax 小模型就夠）、又快又穩不幻覺。
- **三層系統**：① 積木庫（可擴充零件，含未來 timeline/list）② 自動排版（一鍵排初稿）③ 畫布（產出後人自由加/改/排，**不鎖死**）。AI 和人共用同一套積木庫。
- **相輔相成**：資料庫品質 = 系統天花板。內容填充（補標籤/圖，尤其飯店）**公司後續補、不歸 code 側管**；系統「當料會齊」設計、料沒到就優雅降級。料補一分、畫面好看一分。
- **優雅降級 = 賣點命脈**（不是技術細節）：七成行程陽春（每天一句話），但有景點庫當靠山，靠 attraction_id JOIN 撈料、撈不到才降級（料少也體面、沒料就收起、絕不開天窗）。

### 6 步施工順序（藍圖第九節、一步都還沒動）

1. **每日行程優雅降級 + JOIN 景點庫** ← 下一鏟（吃景點庫這個最強地基）
2. 領隊 + 集合卡（有才顯示）
3. 總覽開關 + 各積木 toggle
4. 亮點凸顯（有料景點 + 業務釘選）
5. AI 從填空 → 潤色
6. 一鍵 UX：空白 → 按 AI → 產出

### 等 William 拍板 / 未決

- **排印規範存 memory**：我提議把「分隔用「・」、句末不收句號」存進 `venturo-chinese-typography-rules` memory、列了關鍵字、**William 還沒回**。接手可再問。
- **Step 1 何時起手**：交班時 William 還沒說「現在動 code」還是「再想想」。接手先確認。

### 已拍板的設計細節（都進藍圖、不用再問）

- 風格**依主題選、不鎖留白**（熱鬧主題該飽滿、沉靜主題才留白）；所有參考（ui-ux-pro-max 50+風格 + 71品牌）納入池、依 tags 選、支援多套風格 token。
- **米其林不獨立成區** → 美食區叫「**特色美食**」、米其林只是餐廳屬性標章之一。
- 排印：分隔「・」（貼緊無空格）、句末不收句號、句中保留。

---

## 下層：詳細（想深挖再讀）

### 關鍵檔案

- **藍圖（先讀這個）**：`workspace/_meta/architecture/2026-05-27-行程展示頁-框架.md`（11 節）
- **視覺原型**：`workspace/_meta/prototypes/行程展示-C-優雅landing.html`（優雅 C、HTML 稿、**非 ERP 實跑**）。資料來源 `_itinerary-data.md`（名古屋真實資料 + 三段降級範例）。另有 A/B 原型 + index.html 列表。
- **真 ERP canvas code**（Step 1 要動）：
  - `src/lib/canvas/canvas-from-tour.ts`（`buildCanvasFromTour` 自動生成、現在死板、餐食只拿文字沒 JOIN restaurants）
  - `src/components/canvas-renderer/types.ts`（`CanvasSection` union 第 273 行、`CanvasDayBlock` 第 225 行；**無 Zod、無 version 欄位**）
  - `src/components/canvas-renderer/CanvasRenderer.tsx`（`renderSection`/`renderDayBlock` 用 `const _exhaustive: never` 窮舉 → 加新 type 會 TS 強制補 renderer）
  - 編輯器：`src/app/(main)/tours/[code]/display-editor/_components/EditorPanel.tsx` + `block-editors/`（13 積木只 5 種有編輯器=畫布半殘）
  - AI：`src/app/api/tours/[code]/ai-assist/route.ts`（MiniMax abab6.5s、只回 patches 文字）+ `canvas-utils.ts` analyzeCanvasForAi（只補 cover.subtitle/day_header.summary/appendix）
  - 對外頁 `/p/tour/[code]/canvas`、儲存 `tour_display_overrides.canvas`

### 探查關鍵事實

- **`tour_display_overrides` = 0 筆**（沒人發布過）→ 改 canvas 型別**相容零風險**。
- 行程↔景點：`activities[].attraction_id` 連 attractions 表、`/api/itineraries/[id]/route.ts` 有「用 attraction_id 補描述」JOIN 機制。餐食/飯店**沒連** restaurant_id/hotel_id（純文字）。
- 行程資料光譜（17 團）：7 成第一天只有一句 title、3 成有結構化 activities。focus_cards/price_tiers/features **0% 填充**；領隊 41%、集合 35%；去回航班 100%。
- 資料庫地基體檢：景點 2467（描述99%/標籤55%/圖40%）強；餐廳 312（描述85%/標籤8%）；飯店 490（描述17%/圖6%）近空殼。
- 既有 13 積木：cover/overview_timeline/day_header/route_card(1up/2up/3up/transit)/sequence_steps/hotel_card/flight_card/restaurant_card/feature_hero/stall_grid/spotlight/jp_note/stays/appendix。**flight_card 有定義但 buildCanvasFromTour 不生它**（航班破口）。

### 這場對原型「優雅 C」做的改動（已存檔）

圖片加高填滿右欄、摘要 bar 整列航班不換行、拿掉景點相片牆圓圈編號、補 4 版型（亮點/領隊/特色美食/報價梯次）、分隔統一「・」、句末去句號、美食區改「特色美食」。

### git / 環境

- branch：`fix/customers-into-database`（這場 commit 了 handoff + 藍圖 + 原型 C 三個 workspace 檔）。
- ⚠️ 別 session 的活在 working tree（finance/disbursement 一票 M 檔）——**別碰、別 git add 它們**。commit 只列自己明確檔名。
- STATE_DIR：`~/.claude/channels/telegram-robin/`（session 啟動讀 handoff.md、已同步覆寫此份）。

— Robin、2026-05-27
