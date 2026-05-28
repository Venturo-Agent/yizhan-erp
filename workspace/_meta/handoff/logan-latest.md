# Logan 交接筆記 — 2026-05-28（onboarding 教學鏈衝刺）

> /handoff 接班時讀這份。對話太長清掉重啟、進度全在這 + git。

---

## 上層 3 行（先看這）

1. **你是誰**：Logan（VENTURO 統整 / 起草 / 跨域協調）
2. **上一場到哪**：onboarding 教學鏈做了 3 大塊已 commit、藍圖 18 個 item 完成 4 個、剩 14 個（含 2 個卡點）
3. **下一個動作**：跟 William 確認從哪個 item 接續（建議 C5 人資管理教學 或 C6 財務出納教學、純加新 tour 風險低）

---

## 中層（5–10 條重點）

### ✅ 這一週已 commit（branch `fix/customers-into-database`）
- `c752bb2` 側邊欄導覽（NextStepjs、動態跟權限、莫蘭迪卡片）
- `4bf901c` 公司設定 UI 重構 + 公司設定導覽 + 旅行屬性 + 分公司精簡 + 系統脈絡圖建立
- `14d7fd5` 旅遊團導覽完整鏈 + 開團/提案 dialog 教學 + onboarding 藍圖（本場最後一個 commit）

### 📄 必讀文件（接班先讀）
- **藍圖**：`workspace/系統脈絡圖/onboarding-教學藍圖.md`（18 item、設計原則、TourProvider 機制）
- 公司設定重構待辦：`workspace/系統脈絡圖/公司設定-重構待辦.md`（結帳/匯款/稅率/銀行 → 搬到財務設定）
- 側邊欄與個人偏好脈絡卡：`workspace/系統脈絡圖/側邊欄與個人偏好.md`

### 🎯 待辦（藍圖內、按建議順序）
- **C5 人資管理教學**（4 點：職務管理 → 功能權限 → 旅遊團權限對應「團控/業務」→ 員工列表新增不點教學）— 路徑 `/hr` + `/hr/roles`
- **C6 財務出納教學**（4 點：新增 → 選出帳帳戶儲存 → 預覽列印 → 出帳完成不可改）— 路徑 `/finance/treasury/disbursement`
- **D 財務設定銀行帳戶 UI 改**：拿掉「代碼/名稱/預設帳戶」欄位、加「分行/戶名」、placeholder 改、跨行手續費小字清
- **E 財務設定收款方式 UI 改**：「開放自助收款」內外重複移除、「說明/付款資訊」刪掉
- **C1 訂單 tab 教學**（一團多訂單 + 4 功能：編輯聯絡人 / 成員 / 帳單合約 / 設定）
- **C2 成員管理教學**（手動新增、OCR 已移除）
- **C3 收款教學**（5 點：選團 / 選單 / 方式日期 / 明細 / 備註）
- **C4 請款單教學**
- **C7 公司收支教學**

### ⏸ 卡點（需 William 補資訊才能動）
- **A1 訂單面板「設定」按鈕壞掉**：探查報告說沒看到 level/權限問題、可能是 `OrderMembersDialog` 的 toolbar 投影邏輯失效。**需 William 提供截圖或描述「壞哪裡」**（按鈕沒出現？點了沒反應？下拉空？）才能精準修。
- **B 請款單 UX 三件套**（供應商建立流程 / 代墊人下拉 / 單價數量）：需 DB schema 探查 + 邏輯改、規模大、不在「自動跑」範圍。Logan 推薦「找不到供應商時跳新增 dialog 確認」、避免無聲建造成錯字污染表。

### ⚠️ 共用工作區紀律（很重要、本場踩過 2 次）
- 別的 session 大量在動：`zh-TW.json` / `ai/` / `calendar/` / `finance/` / `hr/roles/` / `library/` / `orders/` / `quotes/` / `tours-edit/` / `workspaces/` / `line/` / `lib/print/` / `data/entities/` 都有改動
- **commit 一律 `git add <明確檔>`、絕不 `git add .` / `-A` / `-u`**（憲法多 session 紀律）
- 動 `zh-TW.json` 用 `git add -p` 分離 hunks（已驗證過 2 次可行：本場 commit `4bf901c` 用過、模式：`printf "n\ny\ny\nn\n" | git add -p messages/zh-TW.json` 看 hunk 數量再給答案）
- 別人 staged 過 5 個檔（`package.json` / `package-lock.json` / `DisbursementPrintDialog.tsx` / `PagedPreview.tsx` / `pagedjs.d.ts`）、本場已 `git reset HEAD` unstage 掉、留在 working tree（給對應 session 自己處理）

### 🛠 William 偏好（節奏）
- 分批 commit（每 item 完成 commit 一次、可分批 review、出錯易 revert）
- 「一路自動跑、做完一起對」模式（本場後段切換成這個、但 context 不夠跑完所有 backlog 才 /handoff）
- 不喜歡反覆問、給足計畫直接做
- 強迫症：檔放對分區、不留半成品在根目錄
- 動既有 UI 前先 scout（憲法第 9 條）；移除欄位先驗證影響面（紅線 #4）

---

## 下層（想深挖再讀）

### 🏗 TourProvider 多 tour 機制（已上 5 個 tour）
- 檔：`src/components/tour/TourProvider.tsx`
- 5 個 tour：`sidebar` / `settings` / `tours` / `open-tour` / `open-proposal`
- 加新 tour SOP：
  1. 寫 `src/lib/tours/<name>-tour.tsx`（export `<name>Tour: Tour[]`）
  2. TourProvider 加 import + `...spread` 進 steps（注意：可選 tour 用條件 spread、見 settings 例子）
  3. 在合適觸發點寫 useEffect / event listener、`startNextStep('<name>')`
- 觸發機制範例：
  - pathname-based（如 `sidebar` 進首頁、`settings` 進 /settings/company）
  - dialog open + props（如 `open-tour` 進 TourFormShell isOpen+create+!isProposalOrTemplate）
  - 上一段完成 event（如 tours-tour 完成 → 自動開團 dialog）

### 🎨 已建可重用元件 / pattern
- **TourCard**（`src/components/tour/TourCard.tsx`）：莫蘭迪卡片、`data-tour-card="true"` 防 dialog 誤關、`side='right-top'` 自動往上推（避免貼底切）
- **ResponsiveHeader.rootDataTutorial prop**：給 fixed header 加錨點用（之前才能被 spotlight 框到）
- **CustomEvent 'venturo:open-tour-dialog'**：跨組件接續模式（ToursPage 監聽 → 自動 handleOpenTourDialog）
- **自訂 instant scroll**：`noInViewScroll={true}` + `scrollToTop={false}` + `onStepChange` 自己 `el.scrollIntoView({behavior:'auto'})` 對「不在視野」的元素 — 解 NextStepjs 平滑捲動跟高亮框不同步的硬傷

### 🛡 共用元件動既有的紀律
- **動共用組件加 optional prop**（如 ResponsiveHeader.rootDataTutorial）— 不破壞既有用法、其他頁不傳就維持原狀
- 教訓：本場曾試過在 TourFilters 包 div wrapper、發現 ResponsiveHeader 是 `fixed` 脫離流、wrapper 高度 0 → spotlight 框錯位置 → 改用 prop 才解決

### 🔄 已實作的教學接續鏈（給未來參考）
1. `/tours` → `tours-tour` 2 步自動跑
2. tours-tour 第 2 步「完成」→ TourProvider `onComplete` 偵測 tour='tours' → `window.dispatchEvent(new CustomEvent('venturo:open-tour-dialog'))`
3. ToursPage `useEffect` 監聽 → `handleOpenTourDialog()` → dialog open
4. TourFormShell `useEffect` 偵測 `isOpen + create + !isProposalOrTemplate` → 200ms 後 `startNextStep('open-tour')`
5. open-tour 5 步跑完（第 5 步引導按建立）
6. 建好正式團 → `useTourCreateOperation.ts` 跳 toast「點報名加客人」（提案/模板不跳）
7. （**待做** C1+）按報名 → 進詳情頁 → 訂單 tab 教學

### 🧹 孤兒檔（本場留下、未來 cleanup pass 可清）
- `PassportUploadZone.tsx`（OCR 移除後變孤兒、檔保留遵紅線 #4）
- `usePassportUpload.ts`（OCR hook、變孤兒）

### 📌 William 補件提過、藍圖未列正式 item
- 「教學跑完後的長鏈」（建好團 → 報名 → 進團 → 收款）— 還沒完整串、目前只到 toast 提示
- 「自動建供應商 vs 跳 dialog 確認」— Logan 推薦「跳 dialog」、William 還沒拍板
- 「教學要做成 i18n 字串嗎」— 沒問過、目前 content 都 hardcode 在 tour 腳本檔

### 🚧 dev server
- 早上有起一個（background task id `bp97hf4ks`）、可能還活著
- 新 session 重起：`npm run dev`（背景 + run_in_background:true）

### 📊 場上累積的時數脈絡（給接班的人知道為什麼這麼多東西）
- 5/27：規劃對外行銷 + 專案作戰室 spec
- 5/27 晚：側邊欄導覽（c752bb2）
- 5/28 上午：公司設定 UI 重構 + 導覽（4bf901c）
- 5/28 中：旅遊團教學鏈（14d7fd5）— 含 5 步開團、提案、接續、滾動修、dialog 誤關修、toast 提示
- 5/28 下午：本場、accumulated 18 item backlog、完成 OCR 移除 + 藍圖、跑 /handoff

---

## 接班第一句話建議

> 「Logan 接班、讀過藍圖。上一場 14d7fd5 commit 完旅遊團教學鏈、藍圖剩 14 個 item。建議從 C5 人資管理教學接續（純加新 tour、風險低、能快做 1-2 個 commit）。要繼續還是換方向？」
