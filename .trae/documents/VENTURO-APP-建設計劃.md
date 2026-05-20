# VENTURO App 建設計劃（完整版）

> 建立日期：2026-05-20
> 版本：v1.0

---

## 1. Summary

建立 Flutter iOS App，作為 VENTURO ERP 的移動端入口：

- **業務端**：我的訂單、顧客管理、看板建立團
- **訊息整合**：LINE@ 訊息同步（LINE 風格 UI）
- **供應鏈**：雙向報價協作
- **司機端**：小車派遣接收

**獨立專案**，不影響原本 Next.js ERP。

---

## 2. 技術決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| Framework | Flutter 3.x | iOS/Android 一次開發 |
| 目標平台 | iOS 優先 | William 確認 |
| UI 風格 | 明亮活潑 | William 確認 |
| 認證 | Supabase Auth | 與 ERP 共用 |
| 訊息整合 | LINE@ 訊息同步 | William 確認 |
| 狀態管理 | Riverpod | William 熟悉 |
| 路由 | GoRouter | Flutter 標準 |

---

## 3. UI/UX 設計方向

### 3.1 主題設定（明亮活潑）

```dart
// 色彩系統
primary: #00D9A5 (明亮綠)      // 主按鈕、重點
secondary: #FF6B6B (活潑紅)   // 警示、強調
accent: #4ECDC4 (清新青)       // 次要強調
background: #F8FAFC (淺灰白)  // 背景
surface: #FFFFFF (純白)        // 卡片
textPrimary: #2D3436          // 主要文字
textSecondary: #636E72       // 次要文字

// 圓角
large: 24px    // 卡片
medium: 16px   // 按鈕
small: 8px     // input
```

### 3.2 字體設定

- **標題**：Satoshi / Outfit（幾何無襯線）
- **內文**：Inter（網域襯托）
- **數字**：JetBrains Mono（等寬）

### 3.3 間距系統

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

### 3.4 主要頁面 Layout

#### 首頁 Tab 導航

```
┌─────────────────────────────────┐
│  🏠 首頁   📦 訂單   💬 訊息   ⚙️  │
│                                 │
│  [我的訂單]  [顧客]  [設定]    │
│                                 │
└─────────────────────────────────┘
```

#### LINE 風格訊息頁

```
┌─────────────────────────────────┐
│ ← 返回     王大明               │
├─────────────────────────────────┤
│                                 │
│  [對方訊息泡泡]                 │
│                                 │
│         [我的訊息泡泡]          │
│                                 │
├─────────────────────────────────┤
│ [📎] [輸入框...]          [送出]│
└─────────────────────────────────┘
```

#### 看板模式（建立團）

```
┌─────────────────────────────────┐
│  報價行程看板                    │
├─────────────────────────────────┤
│ 草稿    │ 報價中  │ 已確認  │已完成│
├─────────────────────────────────┤
│ ┌─────┐ │ ┌─────┐ │ ┌─────┐ │     │
│ │Card │ │ │Card │ │ │Card │ │     │
│ │拖曳 │ │ │     │ │ │     │ │     │
│ └─────┘ │ └─────┘ │ └─────┘ │     │
└─────────────────────────────────┘
```

---

## 4. 專案結構

```
venturo_app/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   ├── config/
│   │   ├── supabase.dart
│   │   ├── theme.dart
│   │   └── routes.dart
│   ├── models/
│   │   ├── order.dart
│   │   ├── quote.dart
│   │   ├── customer.dart
│   │   ├── supplier.dart
│   │   └── line_message.dart
│   ├── services/
│   │   ├── supabase_service.dart
│   │   ├── order_service.dart
│   │   ├── quote_service.dart
│   │   ├── customer_service.dart
│   │   └── line_service.dart
│   ├── providers/
│   │   ├── auth_provider.dart
│   │   ├── order_provider.dart
│   │   ├── quote_provider.dart
│   │   ├── customer_provider.dart
│   │   └── message_provider.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   └── login_page.dart
│   │   ├── home/
│   │   │   └── home_page.dart
│   │   ├── orders/
│   │   │   ├── orders_page.dart
│   │   │   └── order_detail_page.dart
│   │   ├── quotes/
│   │   │   ├── quotes_board_page.dart
│   │   │   └── quote_detail_page.dart
│   │   ├── customers/
│   │   │   ├── customers_page.dart
│   │   │   └── customer_detail_page.dart
│   │   ├── messages/
│   │   │   ├── conversations_page.dart
│   │   │   └── chat_page.dart
│   │   └── settings/
│   │       └── settings_page.dart
│   └── widgets/
│       ├── order_card.dart
│       ├── quote_card.dart
│       ├── chat_bubble.dart
│       ├── kanban_board.dart
│       └── empty_state.dart
├── pubspec.yaml
└── ios/ (設定保持不變)
```

---

## 5. Phase 1 實作順序

### Step 1: Flutter 專案初始化
- 建立 Flutter 專案
- 安裝依賴（Riverpod、Supabase、GoRouter）
- 設定主題色彩系統

### Step 2: 認證模組
- 登入頁面（電話 + OTP）
- Supabase Auth 串接
- Session 管理

### Step 3: 首頁框架
- 底部 Tab 導航
- 頁面路由（GoRouter）
- 主題設定

### Step 4: 我的訂單（核心）
- 訂單列表 API
- 訂單卡片 UI
- 訂單詳情頁

### Step 5: LINE 風格訊息
- LINE@ API 串接
- 對話列表
- 訊息泡泡 UI

### Step 6: 顧客查詢（唯讀）
- 顧客列表 API
- 顧客搜尋
- 顧客詳情

### Step 7: 看板模式
- BoardView Widget
- 拖曳功能
- 卡片詳情

---

## 6. API Endpoints（需在 ERP 新增）

| Endpoint | 方法 | 說明 |
|----------|------|------|
| `/api/app/orders` | GET | App 專用訂單列表 |
| `/api/app/orders/[id]` | GET | 訂單詳情 |
| `/api/app/quotes` | GET | 看板資料 |
| `/api/app/quotes/[id]` | GET | 報價詳情 |
| `/api/app/customers` | GET | 顧客列表 |
| `/api/app/customers/[id]` | GET | 顧客詳情 |
| `/api/line/conversations` | GET | LINE 對話列表 |
| `/api/line/messages` | GET | 訊息歷史 |

---

## 7. 驗證標準

- [ ] Flutter 專案可以編譯
- [ ] iOS 模擬器可以執行
- [ ] 登入成功（Supabase Auth）
- [ ] 訂單列表正常顯示
- [ ] LINE 訊息可以同步
- [ ] 看板可以拖曳

---

## 8. 下一步

1. ✅ 技術決策確認
2. ⏳ 建立 Flutter 專案
3. ⏳ 實作 Phase 1 功能
4. ⏳ iOS 測試
5. ⏳ Phase 2（供應鏈、司機端）