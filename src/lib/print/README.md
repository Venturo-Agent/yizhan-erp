# 列印系統 @/lib/print

## 使用時機

任何要列印的功能都用這裡的組件。

---

## 組件一覽

| 組件               | 用途                         |
| ------------------ | ---------------------------- |
| `PrintableWrapper` | 完整預覽對話框（含頁首頁尾） |
| `printElement()`   | 直接列印 DOM 元素            |
| `printHtml()`      | 直接列印 HTML 字串           |
| `PrintTemplate`    | 輕量版模板                   |

---

## 使用方式

### 方式一：完整預覽（推薦）

```tsx
import { PrintableWrapper } from '@/lib/print'

function MyComponent() {
  const [showPrint, setShowPrint] = useState(false)

  return (
    <>
      <Button onClick={() => setShowPrint(true)}>列印預覽</Button>

      <PrintableWrapper
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        onPrint={() => window.print()}
        title="需求單"
        subtitle="REQUIREMENT"
      >
        <div>內容...</div>
      </PrintableWrapper>
    </>
  )
}
```

### 方式二：直接列印（無預覽）

```tsx
import { printElement } from '@/lib/print'

function MyComponent() {
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    printElement(contentRef.current, {
      title: '文件標題',
      margin: 15, // mm
      fontSize: 12, // px
    })
  }

  return <div ref={contentRef}>內容...</div>
}
```

---

## 設計規範

### 尺寸

- 紙張：A4（210mm × 297mm）
- 邊距：15mm（預設）
- 字體：13px（預設）

### 顏色

使用 `MORANDI_COLORS`：

```tsx
import { MORANDI_COLORS } from '@/lib/print'

MORANDI_COLORS.gold // 金色（標題）
MORANDI_COLORS.brown // 棕色（內文）
MORANDI_COLORS.border // 邊框
```

### 頁首頁尾

- 頁首：Logo + 公司名（從 workspace 設定取）
- 頁尾：公司資訊（從 useCompanyInfo 取）
- 多頁時每頁都顯示

---

## ❌ 禁止事項

1. **不要自己寫 iframe 列印邏輯**
2. **不要硬編公司名稱**
3. **不要在組件內寫 @page CSS**

---

## 檔案結構

```
src/lib/print/
├── index.ts              # 統一匯出
├── PrintableWrapper.tsx  # 主要預覽組件
├── PrintHeader.tsx       # 頁首
├── PrintFooter.tsx       # 頁尾
├── PrintControls.tsx     # 控制按鈕
├── PrintTemplate.tsx     # 輕量模板
├── print-service.ts      # printHtml, printElement
├── print-styles.ts       # 顏色、樣式常數
└── usePrintLogo.ts       # Logo Hook
```
