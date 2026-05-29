# UI primitive 收斂規則（B12 用、給後續工程師對齊）

> 立檔日期：2026-05-29
> 目的：定 primitive 「哪個為準、何時例外」、避免後續再散刻多份。
> 適用範圍：`src/components/ui/`、`src/components/dialog/`、`src/components/shared/`、`src/app/**/*.tsx` 業務頁。

---

## 1. 表格

### 主入口（依場景擇一）

| 場景 | 用什麼 | 為什麼 |
|---|---|---|
| 列表頁（有資料、可排序 / 篩選 / 分頁） | `EnhancedTable`（`@/components/ui/enhanced-table`） | 內建排序、分頁、空狀態、loading、虛擬化 |
| 表格內 inline 編輯（一行一行改、會送 API） | `InlineEditTable`（`@/components/ui/inline-edit-table`） | 內建編輯狀態管理、optimistic update、衝突處理 |
| 純展示型欄位 cell | `@/components/ui/table-cells/*` | money / status / date 共用 cell |

### 合理例外（可繼續用 raw `<table>`）

1. **列印 / PDF 模板**（路徑含 `print-templates/` / `Printable*.tsx` / 跑 `window.print()`）
   - 列印走 iframe / raw HTML、不適合 EnhancedTable 的互動結構
   - 例：`src/app/(main)/tours/_components/print-templates/PrintClosing*.tsx`、`src/app/(main)/orders/_quotes/_components/Printable*.tsx`
2. **會計報表**（trial-balance、general-ledger 等多層 group + 累計小計）
   - EnhancedTable 不適合多層 group footer / 跨頁累計
   - 例：`src/app/(main)/accounting/reports/{trial-balance,general-ledger}/page.tsx`
3. **靜態說明 / 比較表**（純展示、無資料動態）
   - 譬如 quota 等級對照表、頁首固定資訊

### 列表型必改 EnhancedTable

- 有「資料來自 API + 可排序 / 篩選 / 分頁」特徵的、即使現在沒分頁、未來會加 → 直接走 EnhancedTable
- 譬如 `DisbursementRequestsTable.tsx`、`QuoteCostTable.tsx`

---

## 2. 日期

### 三層結構（明確）

| 層 | 檔案 | 對外 API | 用途 |
|---|---|---|---|
| 主入口 | `ui/date-picker.tsx` | `value: string | Date \| null`、`onChange: (iso) => void`、`format: 'dash' \| 'slash'`、`minDate / maxDate: Date` | 業務頁唯一日期輸入 |
| 內部實作 | `ui/date-input.tsx` | 不對外、只給 DatePicker 用 | 3 段直打（YYYY/MM/DD）+ 月曆 popover |
| 月曆 picker | `ui/calendar.tsx` | 給日期 / 區間用 | DatePicker 內部 popover 用、外部可單用做 inline 月曆 |

### 已廢

- `ui/simple-date-input.tsx` — 3 caller（tours 三個 form）已可遷 DatePicker、子任務 2 收掉
- `ui/time-input.tsx` — 1 caller（行程 activity 時間）保留為時間輸入專用 primitive、不跟日期合

### 業務頁紀律

- ❌ `<input type="date">` 永遠不直接用
- ✅ 統一 `<DatePicker value={...} onChange={...} />`
- ✅ 需要 ISO YYYY-MM-DD 字串 → `format="dash"`（預設）
- ✅ 需要 YYYY/MM/DD 字串（列印 / 列表顯示）→ `format="slash"`

### 6 個 raw `<input type=date>` 待改

- `src/app/(public)/pay/[token]/PayFormDialog.tsx`
- `src/app/(main)/workspaces/[id]/_components/billing-tab.tsx`
- `src/app/(main)/hr/_components/SeveranceCalculatorDialog.tsx`
- `src/app/(main)/ai/_components/AiProductsTab.tsx`
- `src/app/(main)/orders/_components/MemberRow.tsx`

---

## 3. Dialog（三層職責）

### 三層

| 層 | 檔案 | importer | 用途 |
|---|---|---|---|
| L1 底層 | `ui/dialog.tsx` | 71 | 純 Radix Dialog wrapper、自帶 `level={1\|2\|3}` z-index 系統 |
| L2 表單 | `dialog/form-dialog.tsx` | 46 | 標題 + content + footer（送出 / 取消按鈕）標準包裝 |
| L3 實體 | `shared/EntityFormDialog.tsx` | （少） | 綁定 entity hook 的 CRUD form、自動 toast / loading |

### 紀律

- ❌ `<div className="fixed inset-0 ...">` 手刻 modal — 全面禁用
- ❌ `createPortal(<div className="fixed inset-0">...)` 手刻 modal — 同理禁用
- ✅ 一般表單彈窗 → `FormDialog`（傳 onSubmit / loading）
- ✅ 純資訊 / 預覽彈窗（無 form） → `Dialog` + 自定 `DialogContent`
- ✅ 綁 entity 的 CRUD → `EntityFormDialog`

### 合理例外（標 eslint-disable + 註解寫原因）

1. **列印 / PDF 預覽 portal**（內部跑 iframe 或 window.print()、需要全螢幕背景遮罩 + 印表機式排版）
   - 例：`PrintableQuickQuote.tsx`（已標 `eslint-disable venturo/no-custom-modal -- 列印預覽需要使用 createPortal`）
2. **圖片 lightbox**（純展示、全黑背景、Esc 關閉）
   - 例：`AiConversationsTab.tsx` 的 `ImageLightbox`
3. **整頁設計頁面**（非 modal、是「跳脫 main layout 框」的整頁工作區）
   - 例：`websites/design/page.tsx`、`(public)/contract/sign/[code]/*` — 是頁面、不是 modal、不算違規

### 待改

- `AiConversationsTab.tsx:881` 對話復盤 modal → `FormDialog`（有 generate button + 歷史列表 + close）
- `AiConversationsTab.tsx:1535` 編輯速記卡 JSON → `FormDialog`（有 textarea + 儲存 / 取消）

---

## 4. 輸入

### 主入口

| 檔案 | importer | API | 用途 |
|---|---|---|---|
| `ui/input.tsx` | 主入口 | 標準 `<input>` props、`onChange: ChangeEvent`、`enableMathCalculation?: boolean` | 文字 / 數字輸入、內建全半形轉換 + IME + 數學表達式失焦計算 |
| `ui/textarea.tsx` | 多行 | 標準 `<textarea>` props | 多行文字輸入 |
| `ui/calc-input.tsx` | Excel 公式 | `value: number \| null`、`formula?: string` + `onFormulaChange` | **不可合 Input**：API 完全不同（number 值 + 公式 state） |
| `ui/rich-text-input.tsx` | 富文本 | 不同 API（HTML output） | 行程描述 / AI 對話編輯、保留獨立 |

### 待收

- `ui/input-ime.tsx`（1 caller 在 `TodoExpandedView.tsx`）
  - API 是 `value: string` + `onChange: (value: string) => void`（非 ChangeEvent）
  - 唯一 caller 可改成 `<Input onChange={e => onUpdate({ title: e.target.value })} />`
  - input.tsx 已內建 IME composition 處理、不需要再多一份
  - 改完即可刪 `input-ime.tsx`

### 不收（保留為獨立 primitive）

- **CalcInput**：API 不同（number + formula）、合進 Input 會破壞 generic 行為、保留
- **RichTextInput**：HTML output、跟 plain text 完全不同實體

---

## 5. 重複 primitive 評估（保留 / 合 / 標記）

評估結果：

| primitive 對 | 結論 | 原因 |
|---|---|---|
| `badge` vs `status-badge` | **保留兩者** | Badge 是通用 pill (cva variants)、StatusBadge 是專門「狀態語意 pill」（綁 status-tone-map）、合會破壞 tone 系統 |
| `empty-state` vs `empty-value` | **保留兩者** | EmptyState 是頁面層引導（icon + 主訊息 + CTA）、EmptyValue 是 cell 層 em-dash「—」、語意完全不同 |
| `spinner` vs `skeleton` | **保留兩者** | Spinner 是「旋轉中」（短任務）、Skeleton 是「佔位區塊」（內容 loading）、語意不同 |
| `form-field` + `form-label` + `label` | **保留三者** | Label 是 inline（Radix）、FormLabel 是 block + mb-2（stacked form）、FormField 是 wrapper（含 Label + 內容 + error）、職責清楚 |
| `field-error` | **可刪** | 0 importer、已被 FormField 內部直接吃、孤兒 |

---

## 6. 整理紀律

- 每改一組做一組 commit（不混批）
- 改 caller 前先 grep 全部用法、再逐檔改
- 改完跑 `npm run type-check` 確認沒回退
- 看到 baseline ratchet 違規（`.eslint-suppressions.json`）就提醒 William、不自己亂加進去
- raw HTML 改 primitive 時若 caller behavior 有風險（譬如 button 樣式可能不一樣）、commit message 註明變動點

---

## 7. 已完成項目（這次 B12 範圍）

- [x] 規則檔（本檔）
- [x] 日期收斂：
  - 刪 `ui/simple-date-input.tsx`（3 caller 改用 `DatePicker`）
  - `DatePicker` 加 `minDate / maxDate` 支援 string、加 `defaultMonth / required`
  - `DateInput` 加 `defaultMonth / required` 透傳
  - 5 個業務頁 raw `<input type=date>` 改 `DatePicker`（pay/billing/severance/ai-products）
  - 1 個表格 cell inline edit raw input 保留並標例外（MemberRow ticketing_deadline）
- [x] Dialog 收斂：
  - `AiConversationsTab` 對話復盤 modal 改 `Dialog`（原 fixed inset-0）
  - `AiConversationsTab` 編輯速記卡 modal 改 `FormDialog`（原 fixed inset-0）
  - `AiConversationsTab` ImageLightbox 保留並標 eslint-disable 例外
  - `PrintableQuickQuote` 列印預覽 portal 已標 eslint-disable（既有合理例外）
  - `websites/design/page` 是整頁工作區、非 modal、不算違規
- [x] 輸入收斂：
  - 刪 `ui/input-ime.tsx`（1 caller 改用 `Input`，因 `Input` 已內建 IME 處理）
  - `CalcInput` 保留：API 是 `number + formula`、不可合進 `Input`
  - `RichTextInput` 保留：HTML output、與 plain text 不同實體
- [x] 重複 primitive 評估：
  - `badge` vs `status-badge`：保留兩者
  - `empty-state` vs `empty-value`：保留兩者
  - `spinner` vs `skeleton`：保留兩者
  - `form-field` / `form-label` / `label` / `field-error`：保留四者（field-error 是 form-field 內部依賴）
- [x] raw table 分類：
  - 寫 `workspace/架構整理/2026-05-29-raw-table-分類清單.md`
  - 54 個 raw table 分 6 類、A-D（40 個）為合理例外、E-F（14 個）待後續 sprint 個別評估
