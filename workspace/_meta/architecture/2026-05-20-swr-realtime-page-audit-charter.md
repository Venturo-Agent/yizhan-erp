# SWR + Realtime 全頁面健檢派工書 — 2026-05-20

> 派工人：William（透過 Claude Opus 4.7 中介）
> 承辦：OPENCLAW（agent: main、人格 Max、model: MiniMax-M2.7）
> 監督：Claude Opus 每 15 分鐘 shell 監控、出事 Telegram 通知 William
> 任務性質：**白天交互模式**（不是整晚自走砲）
> 模式：**兩階段、每階段 Claude Opus 複盤後才放下一階段**

---

## 為什麼開這次健檢（William 親口）

> 「我現在最大問題就是 SWR、尤其是頻道的部分、還有很多地方刪除/新增、是不是會即時顯示/消失。重點不能閃爍、也不能重新整理。」

5/19 SWR 水管健檢（`2026-05-19-SWR-水管健檢.md`）已經做了「抽象層覆蓋率」+「散刻 mutate 全定位」、後續 Round 1-11 把多數修法做完。
但 William 現在仍感受到：
- 頻道（channels）新增/刪除訊息**不會即時顯示**、要 F5
- 多處頁面刪除/新增**畫面閃爍**
- 跨 component 寫入後 UI 不同步

要的不是「再掃一次違反清單」、而是 **逐頁實際使用感受**：每一頁有讀資料的地方、改完之後會不會即時、有沒有閃爍。

---

## 一、你是誰

你是一棧 ERP（yizhan-erp）的 SWR / Realtime engineer **Max**。延續 5/19 SWR 水管健檢的人格與寫作風格：
- 救護車式總覽先講「會死人嗎」
- 表格化、業務語言、不替 William 過度思考
- smoking gun 必標 file:line
- 每頁標 🔴 / 🟠 / 🟡 / ✅ 嚴重度

但這次任務性質不同：是**逐頁實際盤點 + 對錯判斷**、不是「找違反清單」。

---

## 二、任務總覽（兩階段 + Claude Opus 複盤）

```
Pass 1（盤點）→ 你做         ─┐
                                │
                                ▼
Pass 1 複盤 → Claude Opus 做  ─┐ ← 找你漏掉的、確認標記正確
                                │
                                ▼
Pass 2（對錯判斷）→ 你做      ─┐ ← 每筆對照抽象層紅線
                                │
                                ▼
Pass 2 複盤 → Claude Opus 做   ─┐ ← 抽樣覆查判斷、找誤判
                                │
                                ▼
最終報告 → William 拍板修法
```

**Pass 1 你今天先做、不准做 Pass 2**。Claude Opus 複盤後會給你 Pass 1 訂正、然後**才**發 Pass 2 派工書。

---

## 三、Pass 1 任務（今天必做、ONLY 這個）

### 範圍
掃 `src/app/(main)/**/page.tsx` 跟 `src/app/(main)/**/*Tab.tsx`（subpage / tab 都算）、加上 `src/components/**` 內有讀資料的關鍵 component（譬如 dialog 內 list）。

**先以「頁面」為單位**（user 體感）、再下鑽到 component。

### 每頁要記錄的東西（5 個欄位）

| 欄位 | 內容 |
|---|---|
| **路徑** | 譬如 `src/app/(main)/tours/page.tsx` |
| **頁面名（業務語言）** | 譬如「旅遊團列表」 |
| **讀什麼資料** | 列每個讀取點：表名 + 哪個 hook / 直接 useSWR / 直接 supabase.from |
| **寫什麼資料** | 列每個寫操作：新增 / 刪除 / 修改、走哪個 service / 直接 supabase |
| **Realtime 狀態** | 有 / 無、用什麼方式（entity hook 內建 / 手刻 supabase.channel） |

### 產出檔

路徑：`workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass1.md`

格式：

```markdown
# Pass 1 — SWR/Realtime 全頁面盤點 — 2026-05-20

## 救護車式總覽
- 共掃 N 個頁面、M 個 component
- 用 entity hook：X 頁
- 散刻 useSWR：Y 頁
- 直接 supabase.from：Z 頁
- 有 Realtime：W 頁、無 Realtime：V 頁

## 模組分區（依路由）

### 1. tours（旅遊團）
| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| src/app/(main)/tours/page.tsx | 旅遊團列表 | useTours (entity) | apiMutate.tours | ✅ entity 內建 | 看似乾淨 |
| src/app/(main)/tours/[id]/page.tsx | 旅遊團詳情 | useTour (detail) + useToursPaginated | tour-stats.service (有散刻 mutate) | ⚠️ entity 內建、但 service 散刻 | 5/19 已標紅 |

### 2. channels（頻道）← 重點區
（William 痛點區、優先掃完整）
...

### 3. orders / finance / hr / etc
...

## Working Notes（自由寫）
- {遇到的 surprise / 不確定的判斷}
```

### 紅線（Pass 1 階段限定）

**❌ 不准做的事**：
1. **不准判斷對錯**（Pass 1 只盤點、不貼 🔴 紅標）
2. **不准動 code**
3. **不准動 migration**
4. **不准動 production**
5. **不准 push**（commit 可、push ❌）
6. **不准 `--no-verify`**

**✅ 要做的事**：
1. 全部掃完才 commit、commit message：`audit(swr-pass1): SWR/Realtime 全頁面盤點完成 — 2026-05-20`
2. 每 30 分鐘更新進度檔
3. 卡住 > 15 分鐘 → 進度檔註記原因、跳下個項目

---

## 四、Pass 2 任務（**現在不准做、等 Opus 複盤後另發**）

只先告訴你 Pass 2 會做什麼，讓你心裡有底：

每筆 Pass 1 盤點的讀取/寫入點、對照 CLAUDE.md 紅線：
- **紅線 F**：讀資料走 `createEntityHook`、寫入走 `apiMutate`
- **紅線 G**：SWR cache key 帶 user_id（防跨帳號污染）
- **5/19 SWR 健檢的修法**：散刻 `mutate('字串')` 已禁

每筆打 ✅ 對 / ❌ 違規 / ⚠️ 模糊、附 smoking gun + 修法建議。

---

## 五、規矩（不准違反、跟 overnight 一樣）

### 紅線 1：不准動 production
- Supabase DDL / DML 只寫進報告當 SQL 清單、不准跑 MCP
- 留給 Claude / William 用 MCP 代跑

### 紅線 2：commit 不准 push
- commit message 必寫
- `git push` ❌ 絕對不准
- `--no-verify` ❌ 絕對不准
- `gh` CLI ❌ 不開 PR、不發 issue

### 紅線 3：進度檔規格
路徑：`workspace/_meta/architecture/PASS1-PROGRESS-2026-05-20.md`

每 30 分鐘 + 每完成一個模組分區覆寫：

```markdown
# Pass 1 進度 — 2026-05-20

## 即時狀態
- 開始時間：{ISO}
- 最後更新：{ISO}
- 已掃模組：N / M
- 當前模組：{譬如 channels}
- 卡住標記：{NO / YES + 原因}

## 完成清單（依路由分區）
- [x] tours — 12 頁
- [x] orders — 8 頁
- [ ] channels — 進行中
- [ ] finance
- [ ] hr
- [ ] crm
- [ ] cis（外部系統整合）

## Working Notes
{遇到的 surprise / 不確定的判斷}

## 進度紀錄（時間倒序）
- {ISO} — {做了什麼}
```

### 紅線 4：CLAUDE.md 紅線 0-G 必讀
你的所有判斷對齊 CLAUDE.md 紅線、寫進你內部 working memory。

### 紅線 5：不准 hack workaround
- ❌ `as any` / `--no-verify` / mock data
- ❌ 不准動 code 修 bug（這是 audit、只盤點）
- ❌ 不准動 migration

### 紅線 6：卡住的處理
第一次卡住 → 停手 → 進度檔註記 → 跳下個項目。

---

## 六、開工前必做（兩件事）

1. 讀 `CLAUDE.md`（**特別是「技術紅線 F、G」+「中央 Module 索引」中的 SWR/Realtime 段**）
2. 讀 `workspace/_meta/architecture/2026-05-19-SWR-水管健檢.md`（**學寫作風格 + 5/19 已盤點過的內容、避免重複勞動**）

讀完再開工。第一個 commit 前先把這兩份檔對自己有影響的紀律摘要寫進進度檔。

---

## 七、心得報告規格（收工必寫）

路徑：`workspace/_meta/architecture/PASS1-LEARNINGS-2026-05-20.md`

```markdown
# Pass 1 心得 — Max — 2026-05-20

## 我這次掃了多少
- 頁面 N、component M、commit 數

## 我覺得自己哪裡判斷對、哪裡可能漏
- {求 Claude 覆查的點}

## 給 Claude 的提醒
- {Pass 2 該注意什麼}
- {William 痛點區 channels 我看到什麼直覺感受}

## 我學到什麼
- {純自我反思}
```

---

## 八、收工條件（Pass 1）

擇一：
1. 全 module 掃完
2. 卡住 > 30 分鐘無法推進
3. 你判斷品質夠了、可進 Pass 2

收工時：
- 寫心得報告
- 最後 commit `audit(swr-pass1): 完成 — N 頁 / M component`
- 進度檔標 finished

---

## 九、Claude Opus 監控機制（你不用管、給你知道）

- shell 監控腳本每 15 分鐘讀你 git log + 進度檔
- 異常通知 William Telegram
- 「異常」包括：卡住 > 30 分鐘、commit 失敗、超出範圍動 code / migration / push

你專注：高質量 Pass 1 盤點、按規矩 commit、即時更新進度檔。

---

## 十、開工指令

第一個 message 你看到「**PASS1-START**」三字 = 正式開工。
回我「**收到、開始讀 CLAUDE.md + 5/19 SWR 健檢、然後盤點 tours 模組**」就行。

---

**附註**：這份派工書如果你看完有不清楚的、開工前提出來、別自己腦補。
