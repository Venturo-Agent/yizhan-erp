# VENTURO App 登入頁建設計劃

> 建立日期：2026-05-20
> 版本：v1.0

---

## 1. Summary

建立 VENTURO ERP 的 APP 端登入頁面，以 PWA 形式存在。

**目標**：完成一個可展示的登入頁面，具備手機 PWA 的視覺效果和使用體驗。

---

## 2. 現況分析

### 現有資源
- **現有登入頁**：`src/app/(main)/login/page.tsx`（網頁版莫蘭迪金主題）
- **設計系統**：`src/styles/tokens.css`（含 iron / morandi / airtable / klein-blue 四種主題）
- **字體**：Noto Sans TC（已設定）
- **已有多主題系統**：可透過 `data-theme` 切换

### 既有設計系統（Iron 主題）
- 主色：`#1f242b`（深灰）/ `#5d6670`（灰金）
- 背景：`#f4f5f7`（淺灰）
- 圓角：`24px`（卡片）/ `20px`（按鈕）/ `8px`（input）
- 陰影：莫蘭迪金底色陰影

---

## 3. 設計方向

### 風格定位
- **基底**：深灰色 / 鐵灰 / 深藍色
- **調性**：活潑、科技感
- **特色**：柔和玻璃質感（Soft Glass Morphism）
- **3D 效果**：漸層光澤、柔和陰影、圓潤卡片

### 色彩方案（基於 Iron 主題 + 調整）
```css
/* 登入頁專用強調色 */
--app-primary: #3a4555;      /* 深藍灰 */
--app-secondary: #5d6670;    /* 鐵灰 */
--app-accent: #00D9A5;       /* 科技綠（活力） */
--app-glow: rgba(0, 217, 165, 0.3);  /* Glow 光暈 */

/* 背景漸層 */
--app-bg-start: #1a1f2e;     /* 深藍黑 */
--app-bg-mid: #2d3444;       /* 深灰藍 */
--app-bg-end: #1f2633;       /* 深藍 */
```

### 字體
- 標題：Noto Sans TC Bold
- 內文：Noto Sans TC Regular
- 數字/代碼：等寬風格

### 玻璃質感元素
- 背景：半透明深色玻璃
- 卡片：毛玻璃效果（backdrop-filter: blur）
- 輸入框：透明底 + 亮邊框
- 按鈕：漸層 + 柔和陰影 + hover glow

---

## 4. 功能需求

### 登入表單
- **組織代碼**：文字輸入，自動轉大寫
- **Email**：Email 輸入
- **密碼**：密碼輸入，可切換顯示/隱藏
- **登入按鈕**：漸層玻璃質感
- **記住代碼**：localStorage 持久化

### PWA 特性
- **Manifest**：獨立的 app-manifest.json
- **Service Worker**：基本快取策略
- **防滑動**：上下左右全部鎖死（overscroll-behavior: none）
- **方向鎖定**：portrait only

### 主題切換
- 保留更換主題功能
- 預設使用「深色科技風」主題
- 支援：iron / morandi / 深色科技

---

## 5. 實作計畫

### Step 1：建立 APP 專用目錄結構
```
src/app/app/
├── layout.tsx          # APP 專用 layout（含 viewport 鎖定）
├── page.tsx            # 登入頁
├── manifest.json       # PWA Manifest
├── globals.css        # APP 專用樣式
└── components/
    └── PhoneFrame.tsx  # 手機框模擬組件
```

### Step 2：建立 PhoneFrame 展示組件
- 模擬 iPhone 機身外框
- 狀態列（時間、信號、電池）
- 瀏海/動態島
- 圓角邊框

### Step 3：實作登入頁面
- 玻璃質感卡片
- 漸層背景
- 表單元素（輸入框、按鈕）
- 動畫效果（進場動畫、hover 效果）

### Step 4：設定 PWA
- manifest.json（name, icons, theme_color, display）
- viewport 鎖定（user-scalable=no, viewport-fit=cover）
- overscroll-behavior: none

### Step 5：新增專屬樣式
- 科技感漸層背景
- 玻璃質感效果
- Glow 效果
- 動畫

---

## 6. 技術細節

### Viewport 鎖定
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

### 防滑動 CSS
```css
html, body {
  overscroll-behavior: none;
  overflow: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
}
```

### 玻璃質感
```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
}
```

### Glow 效果
```css
.glow-button {
  box-shadow:
    0 0 20px rgba(0, 217, 165, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.3);
}
```

---

## 7. 檔案清單

| 檔案 | 操作 | 說明 |
|------|------|------|
| `src/app/app/layout.tsx` | 新建 | APP 專用 layout |
| `src/app/app/page.tsx` | 新建 | 登入頁面 |
| `src/app/app/globals.css` | 新建 | APP 專用樣式 |
| `src/app/app/PhoneFrame.tsx` | 新建 | 手機框模擬組件 |
| `public/app-manifest.json` | 新建 | PWA Manifest |
| `public/icons/app-icon-*.png` | 新建 | PWA 圖示 |
| `next.config.ts` | 修改 | 更新 CSP 允許 app 路徑 |

---

## 8. 驗證標準

- [ ] 頁面可在瀏覽器模擬手機尺寸下正常顯示
- [ ] 上下左右滑動被鎖死
- [ ] 玻璃質感效果正常顯示
- [ ] 表單輸入/送出功能正常
- [ ] PWA 可安裝到桌面
- [ ] 設計風格符合：深灰/深藍 + 活潑科技感

---

## 9. 開發順序

1. ✅ 建立目錄結構
2. ⏳ 實作 PhoneFrame 組件
3. ⏳ 實作登入頁面（含玻璃質感）
4. ⏳ 設定 PWA（manifest + viewport）
5. ⏳ 新增專屬樣式動畫
6. ⏳ 測試驗證