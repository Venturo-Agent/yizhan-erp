# Store 同步系統

解決跨 Store 同步問題：當 Tour 更新時，自動通知相關的 OrderStore 和 MemberStore 重新載入。

## 快速開始

### 1. 在 Provider 中啟用同步

```tsx
// app/providers.tsx
import { StoreSyncProvider } from '@/stores/sync'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OtherProviders>
      <StoreSyncProvider>{children}</StoreSyncProvider>
    </OtherProviders>
  )
}
```

### 2. 在 Store 操作後發送事件

```tsx
// 在元件中使用
import { useTourStore, emitUpdated, TOUR_SYNC_CONFIG } from '@/stores'

function TourEditor() {
  const tourStore = useTourStore()

  const handleUpdate = async (id: string, data: Partial<Tour>) => {
    // 執行更新
    const result = await tourStore.getState().update(id, data)

    // 發送同步事件（會自動通知 OrderStore 重新載入相關訂單）
    emitUpdated(TOUR_SYNC_CONFIG, result)
  }

  return (...)
}
```

## 事件類型

| 事件             | 說明       | 觸發同步             |
| ---------------- | ---------- | -------------------- |
| `TOUR_CREATED`   | 旅遊團建立 | -                    |
| `TOUR_UPDATED`   | 旅遊團更新 | Orders 重新載入      |
| `TOUR_DELETED`   | 旅遊團刪除 | Orders, Members 清理 |
| `ORDER_CREATED`  | 訂單建立   | -                    |
| `ORDER_UPDATED`  | 訂單更新   | Members 重新載入     |
| `ORDER_DELETED`  | 訂單刪除   | Members 清理         |
| `MEMBER_CREATED` | 團員建立   | -                    |
| `MEMBER_UPDATED` | 團員更新   | -                    |
| `MEMBER_DELETED` | 團員刪除   | -                    |

## 預設同步配置

```typescript
import {
  TOUR_SYNC_CONFIG, // Tour 同步設定
  ORDER_SYNC_CONFIG, // Order 同步設定
  MEMBER_SYNC_CONFIG, // Member 同步設定
  ITINERARY_SYNC_CONFIG, // Itinerary 同步設定
} from '@/stores'
```

## 進階用法

### 自訂事件訂閱

```typescript
import { storeEvents } from '@/stores'

// 訂閱 Tour 更新事件
const subscription = storeEvents.on('TOUR_UPDATED', ({ tourId, changedFields }) => {
  console.log(`Tour ${tourId} 更新了欄位:`, changedFields)
  // 執行自訂邏輯
})

// 取消訂閱
subscription.unsubscribe()
```

### 忽略特定來源的事件

```typescript
// 避免 Order Store 自己觸發的事件再次觸發自己
storeEvents.on('ORDER_UPDATED', handler, {
  ignoreSources: ['order'],
})
```

### 手動發送事件

```typescript
import { storeEvents } from '@/stores'

// 從外部（如 API route、Realtime callback）發送事件
storeEvents.emit('TOUR_UPDATED', {
  tourId: '123',
  source: 'external',
  changedFields: ['status', 'departure_date'],
})
```

## 避免無限循環

同步系統內建防護機制：

1. **來源追蹤**：每個事件都帶有 `source` 標記
2. **忽略來源**：訂閱時可指定 `ignoreSources` 來忽略特定來源
3. **Debounce**：50ms 內的相同事件會被合併

## 架構說明

```
┌─────────────────┐
│   TourStore     │─── update() ───► emit('TOUR_UPDATED')
└─────────────────┘                        │
                                           ▼
                                 ┌─────────────────┐
                                 │  StoreEvents    │
                                 │  (Event Bus)    │
                                 └─────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
           ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
           │  OrderStore     │   │  MemberStore    │   │   其他訂閱者     │
           │  (重新載入)      │   │  (重新載入)      │   │                 │
           └─────────────────┘   └─────────────────┘   └─────────────────┘
```

## 檔案結構

```
src/stores/sync/
├── index.ts              # 統一匯出
├── store-events.ts       # 事件管理器
├── use-store-sync.ts     # 同步 Hook
├── with-sync-events.ts   # 事件發送輔助函數
├── StoreSyncProvider.tsx # Provider 組件
└── README.md             # 本文件
```
