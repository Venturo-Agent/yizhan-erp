# UI 盤點：`/change-password`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/change-password/page.tsx`（單檔、含 inline `<style>`）
> 頁面類型：表單（認證頁 — 首次登入強制改密）

## 一句話用途
員工首次登入（must_change_password=true、預設密碼 12345678）強制設定新密碼、成功後自動登入並進 `/dashboard`。

## Layout 骨架
- **頁面框架**：自刻 — 全螢幕置中 `div`（`min-h-screen` + 漸層底）包一張卡片
- **頁首**：卡片內標題「首次登入」+ Lock 圖示 + 副標、無麵包屑、無頁首動作
- **分頁**：N/A
- **client component**：是（`'use client'`、有 useState + form）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 「設定密碼並進入系統」提交鈕 | 手刻 `<button>` + inline CSS class `.cp-button` | — | w-full py-3 | — | `background: var(--morandi-gold)` 純色 + 白字 | 🔴 手刻、未走 `<Button>`；填色非漸層 |
| 顯示/隱藏密碼（眼睛）×2 | 手刻 `<button type=button>` | — | 圖示鈕 | Eye / EyeOff | `text-morandi-muted hover:text-morandi-secondary` | 🟡 認證頁慣例、可接受 |

提交鈕有防連點：`disabled={loading || !next || !confirm}`、`.cp-button:disabled { opacity:.5; cursor:not-allowed }`、符合「儲存鈕 disabled={loading}」紀律。

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 新密碼 | 手刻 `<input>` + `.cp-input` class | password/text 切換 | `border: 2px solid var(--morandi-cream)`、focus `border-morandi-gold` | 🔴 inline `<style>` 自刻、未走共用 Input |
| 再次輸入新密碼 | 同上 | password/text | 同上 | 🔴 同上 |

### 🔽 下拉 / 選擇
N/A

### ☑️ 勾選 / 開關
N/A

### 📋 表格 / 列表
N/A

### 🪟 對話框
N/A

### 🏷️ 狀態標籤
N/A

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 標題鎖頭 | Lock | `size={22}` | `text-[var(--morandi-gold)]` |
| 錯誤提示 | AlertCircle | `size={16}` | `text-morandi-red` |
| 密碼顯示切換 | Eye / EyeOff | `size={16}` | `text-morandi-muted` |

全 lucide。尺寸用數字 px（`size={22}` / `{16}`）、跟 landing 的 em 寫法不同（兩種寫法並存全站）。

### 🃏 卡片 / 容器
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 登入卡片 | 手刻 div | `rounded-[40px]` hardcode | `shadow-[rgba(180,160,120,0.45)_0px_30px...]` hardcode | 🔴 圓角/陰影 hardcode（已 eslint-disable `no-forbidden-classes`） |

### 🔔 回饋 / 空狀態 / 載入
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 錯誤橫幅 | 手刻 div（`bg-morandi-red/10 border-morandi-red/30`）+ AlertCircle | 🔴 錯誤用 morandi-red（美術色）非 status-danger（語意色） |
| 載入態 | 提交鈕文字切「處理中...」 | ✅ 簡單合理 |

## 🔴 不統一 / 異常標記（重點）
- **提交鈕手刻、未走共用 `<Button>`**：用 inline `<style>` 的 `.cp-button`、填色 `var(--morandi-gold)` 純金 + 白字、跟全站主 CTA（`--btn-primary-*` 淡金漸層 + 暖棕字）視覺不同軌。
- **輸入框手刻 inline `<style>`**（`.cp-input`）：未走任何共用 Input 組件、focus ring 用 `rgba(212,175,55,0.1)` hardcode。
- **錯誤色用美術色軌**：錯誤橫幅 + AlertCircle 用 `morandi-red`（美術色）、非 `status-danger` / `status-danger-bg`（語意「危險」色）。語意上「錯誤提示」應走 status-danger token。
- **圓角/陰影 hardcode**：`rounded-[40px]` + 自訂 `shadow-[rgba(...)]`、已用 `eslint-disable-next-line venturo/no-forbidden-classes` 豁免（代表 lint 規則本想擋、此頁刻意例外）。
- **圖示尺寸用 px 數字**（`size={22}`/`{16}`）、與 landing 的 em 寫法不一致。

## 備註
- 此頁是 **認證頁獨立視覺設計**（圓角卡片 + 暖金漸層底 + 大圓角 input）、跟 `/reset-password` 同一套手刻風（見 reset-password.md）、但兩頁 input/button 的 CSS 各寫各的（cp-* vs reset-*）、**沒有共用認證表單組件** → 待拍板是否抽共用認證卡片/輸入框。
- 登入後處理邏輯嚴謹（signOut 清舊 session 防死循環 + clearAllSwrCacheKeys 清快取）、符合紅線 G。
- 定性：**對員工的認證頁、可視為獨立 CIS**；但錯誤色走美術色軌（morandi-red）這點與全站語意色紀律不符、建議改 status-danger。
