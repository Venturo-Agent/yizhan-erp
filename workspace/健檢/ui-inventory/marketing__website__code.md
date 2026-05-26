# UI 盤點：`/marketing/website/[code]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/marketing/website/[code]/page.tsx`
> 頁面類型：`表單 / 詳情`

## 一句話用途
編輯某團官網行銷資料（官網標題 / 副標 / 行程介紹 markdown / SEO / 封面 hero 圖）、可「儲存」或「儲存並上架」。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`
- **頁首**：`title=\`官網行程編輯 · ${tour.code}\`` + `icon={Megaphone}`、有麵包屑（行銷管理 / 官網管理 / 團號）、無頁首動作按鈕
- **分頁**：無（編輯頁）
- **版面**：`grid grid-cols-1 lg:grid-cols-3 gap-4`，左 2 欄文案表單、右 1 欄封面圖 + 狀態 + 動作按鈕

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 找不到團「回列表」 | `<Button>` | outline | default | — | morandi-gold(outline) | ✅ |
| 封面「上傳/更換封面」 | `<Button>` | outline | sm（w-full） | Upload / Loader2 | morandi-gold(outline) | ✅ |
| 右下「儲存」 | `<Button>` | outline | default | Save / Loader2 | morandi-gold(outline) | ✅ |
| 右下「儲存並上架」（主 CTA） | `<Button>` | default（金漸層） | default | Rocket / Loader2 | btn-primary | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 官網標題 | `<Input>` | text(maxLength 120) | 組件預設 | ✅ |
| 副標一句話 | `<Input>` | text(maxLength 160) | 組件預設 | ✅ |
| 行程介紹（markdown） | `<Textarea>` rows=10 | textarea | 組件預設 | ✅ |
| SEO 標題 | `<Input>` | text(maxLength 70) | 組件預設 | ✅ |
| SEO 描述 | `<Textarea>` rows=3 | textarea(maxLength 200) | 組件預設 | ✅ |
| 封面檔案選擇 | 原生 `<input type="file" className="hidden">` | file | 隱藏、由按鈕觸發 | ✅（hidden file 慣用法） |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（上架靠「儲存並上架」按鈕、不在此頁放 switch） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 無 | — | — | — | — | — |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 右欄「官網上架狀態：上架中/未上架」 | 純 `<span>` 文字（非 Badge 組件） | 無外框 | 上架中=`text-morandi-gold`、未上架=`text-morandi-muted` | 🔴 待確認 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁首 | Megaphone | 框架預設 | — |
| 儲存 | Save | `w-4 h-4` | 繼承 button |
| 儲存並上架 | Rocket | `w-4 h-4` | 繼承 button |
| 上傳封面 | Upload | `w-4 h-4` | 繼承 button |
| 無封面占位 | ImageOff | `w-8 h-8` | text-morandi-muted |
| 載入/處理中 | Loader2 | `w-4 h-4` / `w-5 h-5` | text-morandi-secondary/muted |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 左：文案表單 | `<Card>`（lg:col-span-2 p-5） | 組件預設 | 組件預設 | ✅ |
| 右：封面圖 | `<Card>` p-5 | 組件預設 | 組件預設 | ✅ |
| 右：上架狀態 | `<Card>` p-5 | 組件預設 | 組件預設 | ✅ |
| 找不到團 fallback | `<Card>` p-12 | 組件預設 | 組件預設 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 儲存/上傳成功失敗 | `toast`（sonner） | ✅ |
| 頁面載入中 | ContentPageLayout 內 Loader2 spin + 文字 | ✅ |
| 找不到團 | Card 內文字 + 回列表按鈕 | ✅ |
| 封面預覽空狀態 | ImageOff + 「尚未上傳封面圖」 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **封面預覽用原生 `<img>` 而非 `next/image`**：第 312 行 `<img src={form.hero_image_url}>`。檔案有 `import Image from 'next/image'`（第 20 行）但實際沒用到 Image、改用原生 img。違反開發品管 6「圖片走 next/image」。原因可能是 hero URL 為外部 CDN（corner-website-assets bucket）動態網域、next/image 需設定 remotePatterns；屬合理 escape 但 import 殘留是 dead import。標「待確認 + dead import」。
- **上架狀態用裸 `<span>` + `text-morandi-gold` 文字、非語意 status token**：「上架中」用 `text-morandi-gold`（品牌色）當狀態指示、不是 `text-status-success`。雖然這裡語意偏「目前狀態」而非「成功事件」、用品牌金尚可接受、但沒走正式 Badge 組件、形式上與全站 status badge 不一致。標「待確認」。
- 按鈕全走 `<Button>` 組件、variant 正確（主 CTA = default 金漸層、次要 = outline）、防連點 `disabled={saving !== null}` 到位。無 Tailwind 預設色。
- 背景色硬編：`bg-morandi-container/40`、`bg-morandi-container/20` 走 token（OK）；無 hardcode hex。

## 備註
- 完整實作頁。走 entity hook `useWebsiteTours`（複用 list 找 detail、避免多開 SWR key）+ `apiMutate` + `invalidateWebsiteTours`、符合紅線 F。
- 封面上傳走 `/api/storage/upload`（bucket=corner-website-assets）、path 帶 workspace_id 前綴 + timestamp 防 CDN cache。
- dead import：`Image from 'next/image'` 已 import 但未使用（實際用原生 img）。
