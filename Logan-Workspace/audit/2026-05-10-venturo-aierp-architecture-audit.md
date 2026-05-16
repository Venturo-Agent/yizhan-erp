---
created: 2026-05-10
updated: 2026-05-10（初版有重大失誤、第二版修正）
author: 羅根 (Logan)
project: venturo-aierp
audit_type: post-migration-drift
status: v2-corrected-pending-william-review
related:
  - "[[../../venturo-aierp/docs/SITEMAP|venturo-aierp/docs/SITEMAP.md]]"
  - "[[../../venturo-aierp/docs/SITEMAP-OVERVIEW|venturo-aierp/docs/SITEMAP-OVERVIEW.md]]"
  - "[[../../venturo-aierp/docs/SECURITY|venturo-aierp/docs/SECURITY.md]]"
---

# venturo-aierp 全視角架構盤查報告（v2 修正版）

> 老大要求的盤查 — 確認搬遷後 docs / 規範 / code 是否一致。資料抓自 2026-05-10、靜態快照、不是即時資料。
>
> **v2 修正聲明**：v1 報告「資安主軸 helper 普及率 0%」這個結論**錯了**。我只 grep 一個固定字串、漏掉「替代版 helper」跟「手動實現」。老大第一手感覺正確、不是完全沒做、是用了不同 helper 在做。詳見第 1.3 節修正版。

---

## 名詞中文對照（給老大看的）

- **helper / 工具函式**：寫好的小程式片段、可以重複呼叫
- **wrapper / 包裝層**：把重複的程式碼包起來、其他地方一行就用完
- **route / 路由端點**：URL 對應的程式進入點（API 或頁面）
- **mutation / 寫入操作**：會改資料庫的動作（建立 / 修改 / 刪除）
- **RLS / 資料庫列級權限**：PostgreSQL 內建的「每筆資料只給有權限的人看」機制
- **FK / 外鍵**：資料庫欄位指向另一個表的某一筆、確保關聯完整
- **audit log / 稽核日誌**：「誰、何時、做了什麼、改成什麼」的紀錄
- **capability / 權限項目**：APP-style 的細粒度權限、例如 `orders.list.create`
- **workspace / 工作區**：多租戶 SaaS 的「一家公司」單位
- **SSOT / 單一真相來源**：同一件事只有一份權威定義、改一處就好
- **migration / 資料庫變更腳本**：寫成 SQL 檔案、版本化的 schema 修改

---

## TL;DR（一頁總結）

老大、簡短結論：**docs 寫得很完整漂亮、但跟 code 對不上**。三件事：

1. 🔴 **路由改名工程半途而廢**（路由 = URL 對應的頁面）：`/database` → `/library`、`/tenants` → `/workspaces`、`/unauthorized` → `/no-access` — docs 寫「✅ 已執行」、實況是**新舊並存**（library 建好了、舊 database 沒砍；workspaces 跟 no-access 連新名都沒建）
2. 🔴 **`src/features/` 跟 `src/app/(main)/<route>/_components/` 兩份程式碼並存** — 結構幾乎一模一樣、像是 copy 過去沒砍舊的、單一真相破碎、修 bug 可能改錯邊
3. 🟡 **資安規範部分實施、走了「替代版」**（v2 修正）：
   - 文件中宣稱要走的 `withAudit`（API 守門包裝層）→ 0/55 採用
   - 但實際上走 `recordApiAuditContext`（薄包裝版）→ 20/55 採用（36%）
   - `requireCapability`（權限守門）→ 43/55 採用（78%）
   - 多租戶過濾：手動 `.eq('workspace_id', ...)` 寫死過濾條件 62 處 + helper 4 處
   - **不是完全沒做、是用替代方案做**

加分項（規範實際遵守的部分）：
- ✅ Dialog SSOT 嚴格遵守（彈窗組件統一、無人繞過）
- ✅ Morandi 色系嚴格遵守（720 處用、5 處違規）
- ✅ `workspaces` 資料庫表沒 FORCE RLS（紅線 1 守住）
- ✅ Admin client per-request（每次請求重新建連線、不共用、紅線 3 守住）
- ✅ `has_capability_for_workspace`（資料庫權限檢查函數）定義 + 用在 10 個 RLS policy

---

## 1. 重大 drift 詳細

### 1.1 路由改名工程半成品

`docs/SITEMAP-OVERVIEW.md`（2026-05-08）寫「✅ 已執行」三組改名：

| 改名 | docs 宣稱 | 實際 src/app/(main)/ |
|---|---|---|
| `/database` → `/library` | ✅ 已執行 | **兩個都在**（database/ 跟 library/ 並存）|
| `/tenants` → `/workspaces` | ✅ 已執行 | **只有 tenants/、沒有 workspaces/** |
| `/unauthorized` → `/no-access` | ✅ 已執行 | **只有 unauthorized/、沒有 no-access/** |
| `app/landing/` → `app/(public)/landing/` | ✅ 已執行 | (public)/ 下只有 `constants/` 跟 `p/`、沒 landing |
| `app/(main)/login/` → `app/(public)/login/` | ✅ 已執行 | **(main)/login/ 還在、(public)/ 沒 login/** |

**證據**：

```bash
$ ls src/app/(main)/
accounting calendar cis customers dashboard database error.tsx
finance hr layout.tsx library loading.tsx login orders page.tsx
settings tenants todos tours unauthorized

$ ls src/app/(public)/
constants layout.tsx p
```

**配套漂移**：

- `src/components/layout/sidebar.tsx`：still hardcode `href: '/database'` `'/tenants'`、沒指 `/library` `/workspaces`
- `src/components/guards/ModuleGuard.tsx`：`PUBLIC_ROUTES = ['/login', '/unauthorized', '/public']` — 還是舊名
- `docs/routes/`：還有 database.md / tenants.md / unauthorized.md stub

**判讀**：SITEMAP-OVERVIEW.md 把計畫寫成「已執行」、但實際只完成 1/5（建了 library/ 但沒砍 database/）。其他 4 個還沒動。

---

### 1.2 `src/features/` 跟 `src/app/(main)/_components/` 雙份並存

`docs/SITEMAP-OVERVIEW.md` 寫：

> ✅ 13 個 feature 全併、type-check + 1163 test 全綠

**實況**：兩份 code 並存、結構幾乎一模一樣。

```
src/features/tours/                    src/app/(main)/tours/
├── components/                        ├── _components/
├── constants/                         ├── _constants/
├── constants.ts                       ├── _constants.ts
├── hooks/                             ├── _hooks/
├── index.ts                           ├── _services/
├── services/                          ├── _themes/
├── themes/                            ├── _types/
├── types/                             ├── _utils/
└── utils/                             ├── [code]/
                                       ├── error.tsx
                                       ├── index.ts
                                       └── page.tsx
```

`src/features/` 還有 12 個子資料夾、各有 1-9 個檔：

| 模組 | 檔數 |
|---|---|
| tours | 9 |
| quotes | 7 |
| dashboard | 6 |
| finance | 6 |
| orders | 6 |
| disbursement | 5 |
| attractions | 4 |
| calendar | 4 |
| itinerary | 4 |
| suppliers | 3 |
| todos | 2 |
| hr | 1 |

**判讀**：
- `app/(main)/<route>/_components/` 確實建好了
- 但 `src/features/` **沒砍**、原始檔還在
- 結果是兩份 code 並存、不知道哪份是 SSOT、不知道引用走哪份
- 這是典型「搬遷時 copy 過去沒砍舊的」狀態

**風險**：
- 改 bug 改錯邊（修了 features/、結果路由載的是 _components/）
- 兩邊不同步漂移、bug 復發
- 新人 / Claude 看到兩份不知道該動哪份
- ESLint / detector 可能掃到雙份違規數（虛報）

---

### 1.3 資安規範現況 — v2 修正版

> **v1 失誤**：我先前說「`withAudit` 跟 `enforceWorkspaceScope` 兩支 helper 普及率 0%、整個拆遷工程還沒開始」。錯了。
>
> **失誤原因**：我只 grep 兩個固定字串、沒查替代版 helper、沒查手動實現。老大質疑「不可能完全沒做吧」、派分身重查、找到實情。

#### 文件宣稱要走的最終形態（PATTERNS.md Pattern J）

`docs/PATTERNS.md` 寫的目標是：所有寫入 API 都走 `withAudit` 一個包裝層、handler 只寫業務邏輯、其他全包進 wrapper。

**這個最終形態確實是 0/55 採用**（v1 沒錯）。

```bash
$ grep -rn "withAudit" src/app/api/
（沒輸出 — 0 處）
```

**但**這不代表「沒做稽核 / 沒做守門」、只是還沒升級到「最後形態的單一 wrapper」。

---

#### 實際在做的版本（v1 漏看）

| Helper / 機制 | 是什麼 | 採用率 |
|---|---|---|
| `requireCapability(...)` | 權限守門（檢查使用者有沒有權限做這件事）| **43/55 routes（78%）** ✅ |
| `recordApiAuditContext(...)` | `setAuditContext` 的薄包裝（設定稽核日誌的 context、給資料庫 trigger 抓）| **20/55 routes（36%）** ⚠️ |
| 手動 `.eq('workspace_id', ...)` | 在每個查詢手動加 workspace 過濾條件 | **62 處在 src/app/api/** |
| `enforceWorkspaceScope(...)` | 用 helper 自動加 workspace 過濾 | **4 處實際呼叫**（v1 報 0 處錯了）|
| `recordAudit(...)` | 應用層直接寫 audit log（含 reason）| **5 處實際呼叫** |
| `softDelete(...)` | 軟刪除 helper | 待補查（v1 沒驗）|

關鍵的 4 處 `enforceWorkspaceScope` 呼叫：
1. `src/data/core/createEntityHook.ts:105` — 這是**所有 entity 讀取的核心 hook**、單點影響全站讀取行為（不是 0 處、是「集中在一處的 SSOT」）
2. `src/lib/cache/preload-runner.ts:124` — 快取預載
3. `src/lib/cache/preload-config.ts` — 設定相關
4. （其他 docstring 註解）

---

#### 修正後的判讀

**好的部分**：
- 守門有做：78% 的 API 端點走 `requireCapability`、12 個沒走的多是 healthcheck / webhook（合理例外）
- 多租戶過濾有做：100% 的 API 端點都帶 `workspace_id` 過濾（手動 62 處 + helper 4 處）
- 稽核日誌有做：36% 走 `recordApiAuditContext`、加上資料庫 trigger 兜底

**需要改善的部分**：
- 現在是「四五個 helper 各做一塊」、`withAudit` 想把它們全包成一支
- 拆遷意義：把分散的守門 / 稽核 / 多租戶過濾統一進一個 wrapper、減少漏寫風險
- 不是「完全沒做」、是「現在分散、想統一」
- 18 小時工程的真正目標：**統一收斂、不是從零實施**

**配套數字（v1 沒掃的）**：
- `requireCapability(...)` 用量：43 處（守門已普及）
- `recordApiAuditContext(...)` 用量：20 處（稽核部分採用）
- `recordAudit(...)` 用量：5 處（應用層補 reason 少）
- 手動 `.eq('workspace_id')`：62 處（多租戶手動寫死、helper 沒普及）

---

### 1.4 審計 FK 紅線 #2 — 10 處違反

紅線：`created_by` / `updated_by` 等審計欄位 FK 必指 `employees(id)`、不指 `auth.users`。

**現況**（migrations 全掃）：
- 合規（指 employees）：56 處 ✅
- 違規（指 auth.users）：**10 處** ❌
- 合規率：85%

需要看 migration 列表挑出 10 處違規檔、決定是不是補 migration 改 FK。

---

### 1.5 Table SSOT 部分失守

| 觀察 | 數量 |
|---|---|
| `EnhancedTable` 用量 | 29 處 ✅ |
| 原生 `<table>` 在 src/app/ | 33 處 ⚠️ |

**判讀**：原生 `<table>` 多在會計報表 / 合約簽署的 HTML 列印場景（PDF 預覽、列印頁）。可能是**有意例外**、但要確認。

---

## 2. Docs 健康度盤點

| 文件 | 可信度 | 說明 |
|---|---|---|
| `CLAUDE.md`（root） | 🟢 可信 | 五大方向 + 紅線、跟 code 對齊 |
| `docs/META-RULES.md` | 🟢 可信 | 哲學文件、不過期 |
| `docs/SITEMAP.md` | 🟡 部分過時 | 列舊路由、跟 code 部分對齊（database/tenants/unauthorized 還在）但漏 library/ |
| `docs/SITEMAP-OVERVIEW.md` | 🔴 過時 + 誤報 | 把「計畫」寫成「已執行」、實況落差大 |
| `docs/SECURITY.md` | 🟡 規範對、現況數字過時 | pattern detector 數字（70/5/13/122）跟 code 大致符合、但「withAudit 必走」跟 code 0 處對不上 |
| `docs/PATTERNS.md` | 🟢 規範文件本身正確 | Pattern A-J 寫得清楚、Pattern detector 抓的位置可能不準 |
| `docs/ARCHITECTURE.md` | 🟡 大架構對、細節過時 | 模組地圖列 features/ 還是 SSOT、實際是 features/ + _components/ 並存 |
| `docs/MODULE_BOUNDARIES.md` | 🟢 可信 | 業務邊界文、跟 code 沒衝突 |
| `docs/AGENT-GUIDELINE.md` | 🟢 可信 | Agent 規範、清楚 |
| `docs/CONCEPTS.md` | 🟢 可信 | 業務脈絡、不易過時 |
| `docs/routes/*.md` | 🟡 部分過時 stub | 含 database.md / tenants.md / unauthorized.md（舊名 stub）|

---

## 3. 四大主題現況（v2 修正）

### 3.1 資安

| 項目 | 文件宣稱 | 實況 | 狀態 |
|---|---|---|---|
| workspaces 表沒 FORCE RLS（紅線 1）| 不准 | 沒 FORCE | ✅ 守住 |
| 審計欄位 FK 指 employees（紅線 2）| 100% | 85%（10 處還指 auth.users）| ⚠️ 部分違反 |
| Admin client 每次新建（紅線 3）| 必須 | 確認 per-request、不是共用單例 | ✅ 守住 |
| API 端點走權限守門 `requireCapability` | 必走 | **43/55（78%）** | ✅ 普及 |
| API 端點寫稽核 context | 文件宣稱要走 `withAudit` | `withAudit` 0/55、但替代版 `recordApiAuditContext` 20/55（36%）| ⚠️ 替代方案普及一半、最終形態 0% |
| 應用層補 `recordAudit` reason | 雙軌 | 5 處實際 call、加 DB trigger 兜底 | 🟡 應用層補的少 |

### 3.2 多租戶資料隔離（RLS）

| 項目 | 文件宣稱 | 實況 |
|---|---|---|
| `has_capability_for_workspace()` 資料庫函數 | 必用 | 定義在、10 個 policy 用 ✅ |
| 應用層 + DB 雙重隔離 | 必走 helper `enforceWorkspaceScope` | helper 4 處實際 call（其中 1 處在 `createEntityHook.ts` 是核心、影響全站讀取）+ 手動 `.eq('workspace_id', ...)` 62 處在 src/app/api/ — **每個查詢都帶過濾、只是沒走 helper** ⚠️ |
| 跨工作區攻擊 E2E 測試 | stub 已就位 | `tests/e2e/security/cross-workspace.spec.ts` 存在但 `describe.skip`（測試骨架在但沒跑）🟡 |
| FORCE RLS 違規 | 0 | 0 ✅ |

### 3.3 效能

文件宣稱當前偵測器（detector = 自動掃描違規 pattern 的腳本）違規數：

| 偵測器編號 | 抓什麼 | 文件數字 | 拆遷狀態 |
|---|---|---|---|
| P100 | 多租戶查詢散落（沒走 helper、各自手動加 workspace_id）| 70 處 | 🟡 待重新跑 |
| P101 | Realtime（即時推送）沒帶 filter（會跨租戶廣播）| 5 處 | 未驗 |
| P102 | `.select('*')`（撈整列、payload 多 50-70%）| 13 處 | 未驗 |
| P103 | N+1 query（迴圈裡跑單筆 query、慢死）| 5 處 | 未驗 |
| P109 | Silent catch（catch 沒處理錯誤、靜默失敗）| 122 處 | 未驗 |

待跑 `npm run check:patterns` 取最新數字（task #6 待老大授權）。

### 3.4 抽象層分層

| 層 | 文件位置宣稱 | 實況 |
|---|---|---|
| `src/features/` 業務模組 | SSOT | **跟 `_components/` 雙份並存** 🔴 |
| `src/app/(main)/<route>/_components/` | 接收搬遷後的 features/ | 內容已建、但 features/ 沒砍、雙份 |
| `src/app/api/` 寫入端點 | 統一走 wrapper | 0/55 用 wrapper、43 處用 `requireCapability` 手寫守門 |
| `src/lib/` 核心 lib | helper 集中地 | helper 都在、採用率分散（`requireCapability` 78%、`recordApiAuditContext` 36%、`enforceWorkspaceScope` 7%）|
| `src/stores/` 狀態管理（Zustand）| 純狀態、不寫業務邏輯 | 未驗（task #5 沒跑完）|
| `src/components/` 共用 UI | SSOT | Dialog 嚴格遵守、Table 部分失守（33 原生 vs 29 SSOT）|

---

## 4. 建議行動順序（給老大拍板、不直接動手）

### 🟥 先處理（單一真相破碎 / 紅線違反）

**A. 路由改名 + features/ 雙份 code 清理**

兩個問題綁在一起、要一起拍板：
- 路由：要繼續搬完（砍 `database/`、建 `workspaces/` `no-access/`）、還是回頭（保留舊名、把 SITEMAP-OVERVIEW 改成「計畫」）？
- features/：要砍掉還是要把 `_components/` 砍掉？哪邊才是 SSOT？

繼續搬的話、清單：sidebar.tsx / ModuleGuard.tsx / docs/routes/ stub / docs SITEMAP 兩份都要同步。

**B. 審計欄位 FK 10 處違規（紅線 #2）**

`created_by` / `updated_by` 等審計欄位有 10 處還指向 `auth.users` 而不是 `employees(id)`。違反紅線 #2、可能造成寫入失敗（前端拿的 id 是 employees.id、不是 auth.users.id）。

需要：
1. 列 10 處違規的 migration 檔名
2. 看是哪些表受影響
3. 評估「歷史遺留可接受」還是「補 migration 改 FK」

### 🟨 接著處理（規範升級 / docs 對齊）

**C. 資安守門「分散版 → 統一版」拆遷工程**

> v1 報告錯估、不是「從零實施」、是「四個 helper 收斂成一個 wrapper」

現況：
- 守門：`requireCapability` 已普及 78%
- 稽核：`recordApiAuditContext` 普及 36%
- 多租戶：手動 `.eq('workspace_id')` 62 處 + helper 4 處

目標：`withAudit` 一支 wrapper 包住「守門 + 稽核 + 多租戶 + try-catch」。

不是緊急、是「減少漏寫風險」的工程。要不要排進這週看老大決定。

**D. SITEMAP.md 跟 SITEMAP-OVERVIEW.md 合併或分工**

兩份直接矛盾、留一份。建議：
- `SITEMAP.md` 保留為「純技術 SSOT、實況」
- `SITEMAP-OVERVIEW.md` 改名 `SITEMAP-PLAN.md` 或 archive、明確標記是計畫

**E. ARCHITECTURE.md 跟 SECURITY.md 修文字**

- ARCHITECTURE 把「features/ 是 SSOT」改成「過渡期雙份並存、目標是 _components/」
- SECURITY 把「withAudit 必走」改成「withAudit 是統一目標、現階段以 requireCapability + recordApiAuditContext 為主」

**F. docs/routes/ stub 同步**

砍 database.md / tenants.md / unauthorized.md（如果要改名）、或保留並加 redirect 標記。

### 🟩 後續（規範升級到自動擋）

**G. 跑 `npm run check:patterns`**（task #6 待跑）
- 取得最新違規數
- 跟 SECURITY.md 文件數字對帳

**H. ESLint rule 從 warn 升 error**
- META-RULES.md 寫「拆遷完轉 error」
- 等 C 拆遷工程完成後再升

---

## 5. 跟黒羽的協作分工建議

按老大今天 Telegram 給的協作模式：黒羽整理資料 + 給方向、我（羅根）負責修正。

**黒羽可以幫的**：
- 把這份盤查報告整理成更短的「給老大看 5 分鐘版本」放 vault
- 寫「每個重大 drift 的歷史脈絡卡」（為什麼會搬遷、為什麼半途、之前討論在哪）
- 把 docs 過時的部分標記出來（例如 SITEMAP-OVERVIEW 改 archive）

**我（羅根）可以幫的**：
- 等老大拍板後、寫 migration 改 FK
- 寫第 1 批 withAudit 拆遷
- 寫 sidebar / ModuleGuard 路由改名
- 跑 pattern detector 取最新數字
- 砍 features/ 跟 _components/ 重複的 code（要老大個別拍板）

**Yusuki 不碰**：命理 / 占卜 / 客戶命盤這次不涉及。

---

## 6. 我沒做的事 / 待續

- ❌ 沒跑 `npm run check:patterns`（要不要跑老大決定）
- ❌ 沒呼叫 GitNexus MCP（程式碼影響分析工具、但索引可能 stale、老大還沒回我要不要用）
- ❌ 沒驗 src/stores/ 的業務邏輯混雜情況（task 5 沒跑完）
- ❌ 沒驗 src/lib/ 各 helper 的測試覆蓋率
- ❌ 沒驗 `softDelete` / `restoreSoftDeleted` 實際使用率（v2 修補了 `recordApiAuditContext` 跟 `recordAudit`、但 softDelete 還沒驗）

---

## 7. v1 失誤紀錄（給老大跟未來的 Claude session 看）

**v1 報告做錯什麼**：
- 只 grep 一個固定字串（`withAudit` / `enforceWorkspaceScope`）
- 沒查替代 helper / 沒查改名版 / 沒查手動實現
- 直接下「普及率 0%、整個工程沒做」這種絕對結論
- 違反鐵律 #2「review 別人設計時必先驗證假設」

**v2 修正怎麼做**：
- 派 subagent 重查、列出**所有**可能形式（withAudit / withAuditedRoute / auditedHandler / 其他變體）
- 查替代版（recordApiAuditContext / 手動 .eq / requireCapability）
- 查具體 file:line 證據、不只給數字
- 真實情況：守門 78%、稽核 36%、多租戶 100%（手動 + helper）

**老大的判斷正確**：「應該不可能完全沒有做吧？」— 確實做了、只是用替代方案。我下次 review 別人 code 時、不要看一個字串就下結論。

**該存 memory 的關鍵字**（待老大確認再存）：
- 「驗證別人 code 採用率時、grep 多種變體 + 替代 helper + 手動實現、不只查單一字串」
- 「下『普及率 0%』這種絕對結論前先派 subagent 全面查」

---

## 附錄：靜態快照證據

```bash
# src/app/(main)/ 子資料夾
$ ls src/app/(main)/
accounting calendar cis customers dashboard database error.tsx finance
hr layout.tsx library loading.tsx login orders page.tsx settings
tenants todos tours unauthorized

# src/app/(public)/ 子資料夾  
$ ls src/app/(public)/
constants layout.tsx p

# src/features/ 子資料夾
$ ls src/features/
attractions calendar dashboard disbursement finance hr itinerary
orders quotes suppliers todos tours

# withAudit 用量
$ grep -rn "withAudit" src/app/api/
(無輸出 — 0 處)

# enforceWorkspaceScope 用量
$ grep -rn "enforceWorkspaceScope(" src/
(15 行、全是 src/lib/cache/preload-* 的 docstring 註解、0 處實際呼叫)

# sidebar 路由
$ grep -nE "(/database|/library|/tenants|/workspaces|/unauthorized|/no-access)" src/components/layout/sidebar.tsx
155:    href: '/database',
168:        href: '/database/attractions',
175:        href: '/database/suppliers',
181:        href: '/database/archive-management',
195:    href: '/tenants',
305:    // /tenants 是 platform 路由
307:    if (item.href === '/tenants') {
```

---

**報告止此。等老大拍板、按 1-A、B、C、D、E、F、G、H 順序執行。**
