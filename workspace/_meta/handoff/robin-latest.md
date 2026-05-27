# Robin 交班筆記 — 2026-05-27（第二場）

> /handoff 交班、給下一代 Robin。這場把「行程展示頁系統」從規劃推進到**實做 + 完整施工規格書**。
> （channels 同份：`~/.claude/channels/telegram-robin/handoff.md`）

---

## 上層：3 行總結（80% 場景看這 3 行）

1. **你是誰**：Robin（@VT_ROBIN_BOT）、bot 管家、開發階段任何任務都接。這場做主專案「行程 AI 展示頁系統」。
2. **上一場到哪**：①砍掉舊 `/view` 展示系統（48 檔）②做完 Step 1「JOIN 景點庫補料」並真資料驗證見效 ③寫完**可派 subagent 的施工規格書**（6 工單）④William 拍板全部決策。**全部已 commit + push**（打包 commit `05be128`、雲端有備份）。
3. **第一個動作**：讀施工規格書 → 跟 William 確認「開始派工」→ 從**工單 3（開關地基）**派 subagent。工單做完 Robin 收貨（type-check + 真資料驗 + 對驗收標準）。

---

## 中層：任務狀態

### 核心交付目標（不變）

做出「行程 AI 畫的感覺」——同業把陽春行程丟進來、一鍵變漂亮網頁。賣同業的 SaaS 賣點。走「完整的 B」（規則排版 + 景點庫 JOIN + AI 潤色）。

### 這場完成（已 commit + push）

- **砍舊系統**：`/view` 舊分享頁 + `tour-display`（34 檔渲染元件）+ `editor/publish`（孤兒發布）+ 2 支孤兒 API（`itineraries/[id]`、`by-tour/[tourId]`）+ proxy 兩條白名單。共 48 檔刪除。**驗證過對客人零影響**（客人實際用的是官網 `corner.venturo.tw` Astro 靜態站、另一個 repo、跟 ERP /view 無關）。
- **工單 0 / Step 1 補料**：`enrich-itinerary.ts` 多撈 `tags`+`duration_minutes`、每景點帶自己的圖（修圖錯位 bug）、export `EnrichedAttractionMeta`；`canvas-from-tour.ts` 景點卡接上 分類(取中文)/亮點(tags前4)/建議停留(分鐘轉約X小時)。真資料 52 活動 → 分類98%/建議停留58%/亮點31%/圖73% 立刻見效（之前全空）。

### 等下一代做（規格書已寫好、可直接派 subagent）

施工規格書：**`workspace/_meta/architecture/2026-05-27-行程展示頁-施工規格書.md`**（6 工單、每個含 目標/動的檔file:line/步驟/驗收標準/依賴）。

**派工順序**：

```
工單3（開關地基 hidden toggle）先做
  → 工單2（領隊+集合 section）+ 工單4（亮點一鍵升級）可並行
    → 工單5（AI 潤色+零幻覺護欄）→ 工單6（一鍵 UX）
工單1（按圖分流版型）低優先、可延後
```

### William 已拍板的決策（規格書 §一、不用再問）

- **D1-A**：積木開關用 `hidden?: boolean` 欄位做 toggle（可逆、不丟資料）、不是只能刪除。
- **D2-A**：舊 8 個 `show_xxx` 欄位「首次生成時讀來當 hidden 初值、之後不雙向同步」（避免紅線 E 雙寫）。
- **D3-A**：領隊+集合做**獨立 section**（stays 後 appendix 前、有料才生）。
- **D4-A**：景點卡加「一鍵升級為亮點」（轉 spotlight、自動帶料、AI 可建議）。`focus_cards` 維持閒置不接。
- **D5-A**：AI 擴成「填空 + 亮點潤色 + 零幻覺護欄」（只改寫既有料、不准冒新地名/店名/數字）。
- **D6 延後**：按圖分流版型（渲染層已不開天窗、錦上添花）。

### 卡點 / 待釐清（施工到那再問 William、規格書 §六）

- 工單 2：領隊卡要不要放照片（領隊未必是系統員工）。
- 工單 3：`show_features`/`show_pricing_details` 等對應 canvas 哪塊（對照 `itinerary.types.ts` L101+）。
- 工單 4：升級亮點後原景點在 route_card「移除」還是「保留+標記」。

---

## 下層：詳細（想深挖再讀）

### git 狀態

- branch `fix/customers-into-database`、working tree 乾淨。
- 打包 commit `05be128`（多 session 打包、含我全部工作 + 別 session 零星活 sidebar/出納文件）**已 push** 到 `origin/fix/customers-into-database`。
- 後面有別人的 `3f24b34 fix(ui): 頁尾 Logo`（ahead 1、未 push、沒碰我的東西）。

### Canvas 系統地基（subagent 起點）

- 對外頁 `/p/tour/[code]/canvas`：client component、client supabase 走 RLS。
- 型別 `src/components/canvas-renderer/types.ts`：5 section + 10 block、用 `satisfies never` 窮舉（加新 type 漏接 TS 會擋）、無 Zod 無 version。
- renderer `CanvasRenderer.tsx`：`renderSection`(L219)/`renderDayBlock`(L38) switch 分流。
- 生成器 `src/lib/canvas/canvas-from-tour.ts` + enrich SSOT `src/lib/canvas/enrich-itinerary.ts`。
- 編輯器 `src/app/(main)/tours/[code]/display-editor/`：EditorPanel + block-editors（5 種可編）+ canvas-utils（含 analyzeCanvasForAi/compressCanvasForAi/applyAiPatch）+ useDisplayCanvasApi + API `display-canvas/route.ts`（存 `tour_display_overrides.canvas`、發布快照 `published_canvas`）。
- AI `src/app/api/tours/[code]/ai-assist/route.ts`：MiniMax `abab6.5s-chat`、env `MINIMAX_API_KEY`(+optional `MINIMAX_GROUP_ID`)、補 3 種空白、無防幻覺。

### DB 事實（project `aawrgygqgemgqssflfrx`）

- `tour_display_overrides` **0 筆**（改型別/生成器零風險）。
- `itineraries` 18 筆、52 活動全連景點 id、51 JOIN 成功。
- `focus_cards` 0 筆、`leader`/`meeting_info` 多空白。
- 景點庫 2467（tags55%/描述99%/圖40%）強；餐廳 312（tags8%）；飯店 490（描述17%/圖6%）近空殼。

### 全域守則（每個 subagent 必遵、規格書 §五）

排印（・分隔貼緊、句末不收句號）／UI 走 design token 不用 Tailwind 預設色（canvas 用 YONGCHENG\_\* token）／type-check 必綠／不 `git add .` 只加自己動的檔／不碰別 session working tree／AI 零幻覺。

### 相關文件

- 框架藍圖：`workspace/_meta/architecture/2026-05-27-行程展示頁-框架.md`（11 節、方向）
- 施工規格書：`workspace/_meta/architecture/2026-05-27-行程展示頁-施工規格書.md`（6 工單、可派 subagent）
- 視覺原型：`workspace/_meta/prototypes/行程展示-*.html`（HTML 稿、非 ERP 實跑）

### session 啟動讀本檔（`~/.claude/channels/telegram-robin/handoff.md`）

— Robin、2026-05-27 第二場交班
