# Checklists（動手前 8 維度、回頭審視 5 維度）

> 主檔索引在 `CLAUDE.md` § 8 維度 checklist / § 健檢 5 維度。

---

## 開發品管 8 維度（每次動手前對照 checklist、5/12 William 拍板）

> 動任何功能 / 修任何 bug 前、對照這 8 維度。少一條都會出事。

### 1. 公司的概念（VENTURO 為核心、不天馬行空）

- 英文一律 **VENTURO**、不准 MANTU / Mantu / mantu-\* 變體
- 設計扣回 ERP 業務流程、不要照搬 Slack / Notion / 各家 SaaS 全部功能
- 業務面思考優先：先問「對員工 / 客戶 / 老闆有什麼價值」、再問「技術怎麼做」
- 不天馬行空：v1 留 schema 欄位、UI 第一版做最關鍵 1-2 個入口、其他 v2 補

### 2. 開發品管概念（commit / PR 前必跑）

- `npm run type-check` 通過、無 type error
- `npm run lint` 通過、無新增 `console.log`
- `./scripts/check-standards.sh --strict` 通過
- 動完 schema → 更新 type → UI 對齊 → 全套 type check
- ❌ 不准 `as any` / `: any` 蓋 type error、要 fix root cause
- ❌ 不准 `--no-verify` 跳 hook、要查為什麼擋
- 動 RLS migration → 跑 `tests/e2e/login-api.spec.ts`（4/20 那種「全員登不進去」事故避開）
- 大改動完一輪 → 自己 audit（grep 對 spec 拍板項、確認沒漏）、不要等 William 抓

### 3. 安全（資安第一）

對齊「優先順位 #1」+「技術紅線 A」、動手前確認：

- 動 RLS：誰能看、誰能改、跨 workspace 漏不漏（`workspace_id = get_current_user_workspace()`）
- user input 在 API 層先驗證、不靠 RLS 當最後一道
- secret 走 `~/.config/venturo/secrets.env`、不寫死、不放 git
- SQL 用 parameterized query、不字串拼接（防 SQL injection）
- service_role admin client per-request 新建、不能 singleton（紅線 C）

### 4. 資料（schema / FK / 對齊）

對齊「技術紅線 B」：

- 審計欄位（created_by / updated_by / etc）FK 指 `employees(id)`、不是 `auth.users(id)`
- 例外：`user_id` / `sender_id`（這幾欄本來就是 Supabase 帳號）
- 寫入時 `created_by: currentUser?.id || undefined`、**不要** `|| ''`（空字串會炸）
- 軟刪走 `deleted_at`、不真 DELETE
- composite PK 影響 entity hook → 加 surrogate `id uuid PK` + 對 composite 加 UNIQUE
- schema 改先寫 migration 草稿到 `migrations-pending/`、William review 後才 apply

### 5. 效能（資料讀取 / 列表 / 連線）

對齊「優先順位 #2」+「五大方向 5」：

- 列表預設 20 筆、分頁 15 筆、**不**給「每頁筆數」選擇器
- SWR `revalidateOnFocus: false`、`dedupingInterval: 5min`
- entity hook 走 server-side filter（`filter: { tour_id: x }`）、不全撈再前端 filter（egress 殺手）
- 訊息列表 scroll up infinite load、不一次撈全部
- Realtime 走 `createEntityHook` 內建 `useRealtimeSync()`、不自己重寫
- 防連點：所有「儲存 / 刪除 / 確認」按鈕 `disabled={loading}`
- Layout context SSOT：`useLayoutContext`（一次抓 capabilities + features）、不每頁 query

### 6. 組建優化（bundle / load 時間）

- 大型 library（jsPDF / xlsx > 100KB）動態 import（`await import('@/lib/...')`）
- 頁面用 `dynamic(() => import('...'), { ssr: false })` 切 client-only chunk
- 圖片走 `next/image`、自動 webp / 多 size
- icon 從 lucide-react 個別 import、不要 `import *`
- Tailwind 自動 purge、不亂寫 safelist
- Sentry sample rate 設低（0.1 / 0.01）、production 不要 1.0 燒錢
- Next.js route 預設 server component、需要互動才加 `'use client'`

### 7. 抽象層（不過度抽象、不寫 framework）

- **三個重複才抽**：兩個一樣的、複製貼上；第三個出現再抽 function / component
- 不寫「未來可能用到」的 generic helper、現在不用就刪
- 抽象層厚度：撞牆能不能 escape？厚 → 鎖死、薄 → 能逃
  - 厚（Wasp / 高階 ORM）→ 撞牆難 escape、debug 沒救
  - 薄（Drizzle / Supabase RPC / Next.js raw API）→ Claude 寫得穩
- 不寫 framework / DSL / 配置語言、直接寫 code
- Repository pattern / Service layer 等 enterprise 抽象、yizhan-erp 不適用
- 已存在的抽象（`createEntityHook` / `ContentPageLayout` / `FormDialog`）走得通就用

### 8. 租戶 / HR / 路由 對齊（新功能必跑 5 個 SSOT、缺一個就壞）

> 完整 5 SSOT 表格見 `docs/rules/architecture.md` § 5 SSOT。Channels 系統 5/12 踩過「以為 3 個 SSOT、實際 5 個」的坑。

每加新功能、5 個 SSOT（路由 / capabilities.ts / module-tabs.ts / features.ts / seed migration）全部都要動。

---

## 健檢框架 5 維度（2026-05-20 加、每個 module 都該對齊）

> 「8 維度」是**動手前** checklist（per-feature）。「5 維度」是**回頭審視**框架（per-module health check）。
> 兩者並行：寫新功能對 8 維度、做 audit 看 5 維度。

### 5 維度定義

| 維度         | 評估什麼                                                            | 報告檔                                   |
| ------------ | ------------------------------------------------------------------- | ---------------------------------------- |
| **讀取效能** | 每頁讀資料走 entity hook？有無散刻 useSWR / 直接 supabase.from？    | `workspace/健檢/reports/效能層面健檢.md` |
| **資安**     | 紅線 0-G 守了？特別查 created_by FK / closed period / SWR cache key | `workspace/健檢/reports/資安層面健檢.md` |
| **架構**     | 6 層架構過全？L1-L6 各層對齊？                                      | `workspace/健檢/reports/架構層面健檢.md` |
| **開發品管** | 測試覆蓋？lint suppress？type 完整？                                | `workspace/健檢/reports/開發品管健檢.md` |
| **清理**     | unused exports？dead code？已廢 module 殘留？                       | `workspace/健檢/reports/清理層面健檢.md` |

### 滿分 5/5 紀律（William 拍板）

每個 module 都要追 5/5、沒滿分等於沒進步。
27 個 module × 5 維度 = 135 個判決、目標全綠。

矩陣現況：`workspace/健檢/reports/26-modules-x-5-dimensions-matrix.md`
每 module 升 5/5 計劃：`workspace/健檢/pending/upgrades/{module}-to-5of5.md`

### Ratchet baseline 機制（已落地）

- 凍結 145 個 baseline 違規（127 supabase-writes + 18 useswr）
- `npm run lint` 用 `.eslint-suppressions.json` 過濾、新違規 → CI 擋
- `npm run lint:swr-prune` 自動清已修好的
- 詳：`workspace/健檢/decided/ratchet-baseline.md`

### 夜間自動健檢（launchd）

- 00:00 daily：git pull main（com.venturo.yizhan-erp-autopull）
- 00:10 daily：跑 9 個 audit、產報告到桌面（com.venturo.yizhan-erp-nightly-audit）
- 報告位置：`~/Desktop/yizhan-erp-nightly-{日期}.md`
- 設定檔：`~/Library/LaunchAgents/com.venturo.*.plist`

### 收工複盤紀律（cleanup pollution sources）

任何 audit 跑完、發現錯誤判斷 → 回頭把污染源清掉：

1. 加 ✏️ 修正註記到原 audit 報告（保留 audit trail）
2. 過期清單 / drift 條目從清單刪
3. 不留誤導下個工程師的訊息

詳：`~/.claude/CLAUDE.md` § 收工複盤紀律。

### 已凍 / 半成品 module（不算 active）

- `travel_invoice`：2026-05-20 凍住、DB+entity 保留、Phase 2（8 月後）補 UI/API
- `office`：routes:[]、待 William 拍板凍或補完

凍住 pattern：comment out `_registry.ts` 的 import + ALL_MODULES、跑 `codegen:permissions`、不 rm 檔（鐵律 #8）。
