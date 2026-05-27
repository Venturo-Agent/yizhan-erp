# Robin 交班筆記 — 2026-05-26 深夜

> 上一代 Robin 在 William 打 `/new` 時寫的交班、給下一代 Robin。
> 這場從下午 14:07 到深夜 23:30、近 9.5 小時、做了海量事。寫足不砍。

---

## 上層：3 行總結（先看這 3 行、80% 場景夠用）

1. **你是誰**：Robin（@VT_ROBIN_BOT）、yizhan-erp 4 senior bot 之一。⚠️ **開發階段職務分工已拿掉**（William 2026-05-26 拍板）——你最熟 bot infra、但任何任務 William 叫你做就做、不推給別人、不說「這不是我本行」。
2. **上一場做到哪**：修好「展示行程 tab 不見」(commit d953cc6) + 廢進階版 3 選 2 + 電子合約解綁；拿掉 4 bot persona 職務分工；**設計工具鏈整套找回**（9 個斷鏈 skill + awesome-design-md 71 品牌全接回、venturo-design SKILL.md 對齊實際位置）；產出官網/展示行程的設計方向卡 + 升級概念 + 架構框架；評估 William 自做的 3 個 corner-demo。
3. **第一個動作**：接「展示行程/官網**規範書**」這個主任務——先查行程資料實況（景點/餐廳哪些真有圖有細節、報價單/梯次表結構）、再寫規範書 4 塊（見中層）。先 Tg 跟 William 確認接著做還是換方向。

---

## 中層：任務狀態

### 進行中（需要你接手）— 主任務：寫「展示行程/官網規範書」

William 要一份**規範書**（明確設計需求、才請設計師動 UI）。4 塊：

- [ ] **1. 排版應變規則**：一天最多 6 個行程、資料完整度不一時怎麼優雅降級不開天窗。具體情境：(a) 5 個有圖 1 個沒圖 (b) 總共只有 3 個 (c) 根本沒細節資料。要訂「有圖/無圖/數量多寡」的排版降級規則。
- [ ] **2. 領隊 + 集合時間規範**：領隊資料卡 + 集合時間怎麼呈現。（DB 已有 `itineraries.leader` jsonb + `meeting_info` + `outbound_flight`、建議補 `leader_card` 積木）
- [ ] **3. 報價呈現規範**：(a) 要不要接我們的報價單 (b) 報價單有不同「梯次表/看次表」怎麼呈現。← **這塊你要先查報價單/報價 DB 的真實結構**（quotes 相關表）。
- [ ] **4. 特色景點優化 + AI 按鈕**（William 最在意）：解決「京都行程的特色＝錦市場、但被埋在每日行程中間、系統凸顯不出來」。解法＝行程頁加一個 **AI 按鈕**：(a) UX：對不熟 AI 的人、點了感覺像「產生一個新頁面」 (b) 實際：系統基於現有 Canvas 框架、引導使用者輸入「特色是什麼」 (c) 自動：輸入後一連串優化排版、直接產出最終行程表。**這就是「亮點抓取」的 UX 入口（人工釘選 + AI 產出）**。

做法：先查行程資料實況 → 再寫規範書 → William 確認後才請設計師（花叔/ui-ux-pro-max）設計 UI。

### 等 William 拍板（這場累積、還沒回的）

- ❓ **亮點抓取方向**（最關鍵）：建議「讀結構化欄位為主、AI 只排序+潤色」、不純 AI 抽文字。理由：米其林是事實、欄位已打勾（餐廳有 `michelin_stars`/`bib_gourmand`、飯店有 `has_michelin_restaurant`、行程有 `focus_cards`）、規則引擎抓 100% 準零幻覺；讓 AI 硬抽文字會編出假米其林＝對客造假。三層漏斗：結構化抓取→AI 排序潤色→業務人工釘選。William 還沒明確點頭這方向。
- ❓ **設計方向選哪個**：William 自做的 3 個 demo——A Minimal（最美但藏資訊賣團弱）/ B Explorer（質感+資訊最平衡、最貼定位）/ C Elegant（商業完整度最高）。我推薦主力 B 或 C、A 當品牌頁。三個其實是「同組件+三風格 token」、可全納進框架當三套起手主題。William 還沒選。
- ❓ **官網框架 6 個拍板點**：在 `workspace/_meta/architecture/2026-05-26-官網與展示行程-架構框架.md` 第七章。
- ❓ **stitch-design 結構**：它是「外掛包」（6 子 skill）、根目錄無 SKILL.md。要不要攤平成可直接用、還是擱著（現狀能用）。
- ❓ **展示行程現有客戶防護**：永成/角落是旗艦版、DB 開著合約。電子合約解綁後、若有人去他們租戶詳情切方案再儲存、合約會被自動關掉。要不要加「切方案保留手動加購功能」的防護。
- ❓ **commit d953cc6 要不要 push**：展示行程 tab + 電子合約解綁的改動已 commit、**未 push**（在 fix/customers-into-database branch）。William 說 commit 沒說 push。
- ❓ **重啟 Alex/Max/Logan**：persona 改了（拿掉職務分工）、但那 3 個 running session 還是舊 persona、要重啟才生效。

### 已完成（純供參考、不用再動）

- ✅ **展示行程 tab 不見** → 真因：角落 workspace 的 `tours.display-itinerary` feature = false（DB 已開成 true、現有客戶馬上看得到）。順帶補了租戶管理 UI 的開關（overview-tab + TenantPlanSection 加「展示行程」可選功能）。
- ✅ **電子合約解綁方案 + 廢進階版 3 選 2**：進階版改直含人資+會計、旗艦拿掉合約內含、合約改手動加購。清掉 advancePicks 機制跨 11 檔。**commit d953cc6**（type-check 0、check-standards 過、未 push）。
- ✅ **4 bot persona 拿掉職務分工**：servants-common 加「開發階段總綱」、各 bot 出手時機拿掉排他句。紅線/品管/講話規矩全留。
- ✅ **設計工具鏈整套找回**：9 個斷鏈 skill（ui-ux-pro-max / stitch 全套 / shadcn / remotion / taste-design / design-md / react-components / stitch-loop / enhance-prompt）+ awesome-design-md 71 品牌全接回、symlink 全通。venturo-design SKILL.md 改寫對齊實際位置。
- ✅ **修好「Robin 不回 Telegram」**：根因是我（上一代）忘了呼叫 reply tool、誤判成 plugin race。校正＝每則必走 reply tool。

### 卡點 / 風險

- ⚠️ **漫途旅遊設計規範庫從未建**：venturo-design 的「漫途旅遊專屬 design-system（principles/styles/旅遊案例/CIS）」是真的沒建過、不是遺失。這是 venturo-design 跟通用設計 AI 的差異化護城河、之後要從實戰累積。SKILL.md 已誠實標「待建」5 處。
- ⚠️ **多 session 共用工作區**：4 bot + William 共用 `~/Projects/yizhan-erp`。commit 只能 `git add <明確檔名>`、不准 `git add .`。當前 working tree 有一大票別 session 的活（finance/orders/tours UI 統一那批）、別碰。
- ⚠️ **9 個設計 skill 是 symlink**：指向 ~/.agents/skills/、來源已記（見下層）、避免再斷又重查。
- ⚠️ **William context 升級概念**：他頓悟「我們不再只是模板、是完美的提示詞」＝結構化真實資料 + 組件詞彙 + AI 凸顯重點。接規範書時這是靈魂、貫穿。

---

## 下層：詳細歷史

### 重要決策軌跡（這場）

- **職務分工拿掉**（William 2026-05-26）：開發階段任何 bot 接任何任務、專長只代表「優先」、不推諉。
- **電子合約「不綁方案」**（William）：進階版不要 3 選 2、直接含人資+會計；合約改純可選加購。
- **AI 整合方向＝B+C 不是純 A**：組件化打底 + AI 輔助凸顯、不是一口氣 AI 生整頁（不可控、視覺翻車）。
- **亮點讀結構化欄位**：不靠 AI 抽文字（防造假、零幻覺）。
- **設計工具鏈在「我們自己的 skill 體系」整理、不碰 brain vault**（William）。

### 設計 skill 重裝來源（避免未來再斷又重查）

- ui-ux-pro-max ← `github.com/nextlevelbuilder/ui-ux-pro-max-skill`（MIT、71k★）→ 放 `~/.agents/skills/ui-ux-pro-max-skill`、配色/字體在 src/ui-ux-pro-max/data 的 CSV
- 其餘 8 個（stitch-design/stitch-loop/enhance-prompt/shadcn-ui/react-components/remotion/design-md/taste-design）← `github.com/google-labs-code/stitch-skills`（Apache）
- awesome-design-md ← `github.com/VoltAgent/awesome-design-md`（71 品牌 DESIGN.md）→ 放 `~/.agents/skills/awesome-design-md`
- 重裝法：純 git clone、`core.hooksPath=/dev/null` 關 hook、**絕不跑 install/build script**、clone 後移 .git。
- 還活著沒斷的：花叔 huashu-design（62M 實體）、hue（1.8M）。

### 關鍵文件路徑（這場產出的 3 份設計文件）

```
workspace/_meta/architecture/2026-05-26-canvas-editor-拖拉建站-AI整合-設計方向.md   設計方向卡（C→B→A）
workspace/_meta/architecture/2026-05-26-canvas-editor-完整升級概念.md              升級概念（開源建議：只借 dnd-kit 不整套換）
workspace/_meta/architecture/2026-05-26-官網與展示行程-架構框架.md                 官網 8 區 + 展示行程 5 項 + 亮點抓取機制 + 6 拍板點 ★規範書的基礎
（既有參考）workspace/_meta/architecture/2026-05-23-websites-module-spec.md          Max 寫的 websites 模組 5 SSOT/6 層/紅線
```

### Canvas / 展示行程 現狀（接規範書要懂）

- 現有 15 種 Canvas block（積木）：cover/overview_timeline/day/day_header/route_card(4版型)/sequence_steps/hotel_card/flight_card/restaurant_card/stays/feature_hero/stall_grid/spotlight/jp_note/appendix。都會渲染、但只 5 種有編輯器（cover/day_header/route_card/spotlight/jp_note）、其餘唯讀。
- AI 現狀很弱：AiPatch 只認 cover/day_header/appendix 三種、只改既有文字、不會生新 block 不會重排。
- 展示行程 + websites 官網**同源**（同 types/renderer/編輯器）。差別只在儲存（tour_display_overrides.canvas vs workspaces.canvas）+ 多租戶路由。
- websites 模組（5/23）：3 頁 skeleton 空殼、DB 已建（workspaces 加 subdomain+canvas 欄位、website_builder feature 預設關）。
- 入口：業務後台 `/tours/[code]/display-editor`、對外 `/p/tour/[code]/canvas`（沒發布則 buildCanvasFromTour 自動生）。
- 3 個 corner-demo（William 自做、GitHub Pages）：venturo-agent.github.io/corner-demo/direction-{a-minimal,b-explorer,c-elegant}/

### William 的 corner workspace

- William（簡瑋廷 E001、agency@venturo.tw）員工帳號在「漫途整合行銷」workspace（b2222222...）、但操作時切到「角落旅行社」（a89335d4...）看團。展示行程 tab 吃當前 active workspace（角落）的 feature。

---

## 重要紅線（不能違反）

> 詳細看 `~/.claude/CLAUDE.md` + `~/Projects/yizhan-erp/CLAUDE.md`

- ❌ 不准在 transcript 印出 token / API key 真值
- ❌ 不准動 production DB / push code 沒 William 拍板（commit 也要 William 明說）
- ❌ 不准跟用戶提「上一代」、用戶認的是「Robin」這身份的延續
- ❌ 寫 memory 前必先列關鍵字給 William 補（紅線 #3）— 這場有個 memory 待存（設計 skill 來源 + 漫途規範庫待建）、William 還沒回要不要存、你接手可再問
- ❌ 多 session 共用工作區：commit 只 `git add <明確檔名>`、不准 `git add .`
- ❌ 涉及刪除動作必先驗證（紅線 #4）
- ✅ 看到「執行」單獨成句、必 echo 4 步（要做的事 / 對照規矩 / 確認沒違反 / 再動手）
- ✅ 每則 Telegram 訊息必走 `mcp__plugin_telegram_telegram__reply`（別只在 transcript 寫、user 看不到）
- ✅ 動既有 component / UI 前必先派 page-scout（憲法第 9 條）

---

## 環境快查

- STATE_DIR：`~/.claude/channels/telegram-robin/`
- session-id 檔：`~/.claude/channels/telegram-robin/session-id`
- 共用 memory 索引：`~/.claude/projects/-Users-william-Projects-yizhan-erp/memory/MEMORY.md`
- William sender_id：8559214126
- 設計 skill：`~/.claude/skills/`（symlink）→ 目標 `~/.agents/skills/`；花叔 huashu-design + hue 是本地實體
- 當前 git branch：`fix/customers-into-database`（有 commit d953cc6 未 push + 一票別 session 的活）

— 上一代 Robin、2026-05-26 23:30 UTC+8
