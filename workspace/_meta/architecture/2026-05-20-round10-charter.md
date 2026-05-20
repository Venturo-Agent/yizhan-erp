# Round 10 派工書 — 2026-05-20 08:08（簽證代辦完整 UI/API 衝刺）

> 派工：Claude Opus
> 承辦：OPENCLAW Max
> 限時：9 點上班前完成（52 分鐘）
> 模式：真上線、commit、不 push（Claude push）

---

## 背景

簽證代辦 5 個 DB table 已 apply、types.ts regenerate、placeholder page 已上線。**現在補完整 entity hooks + API routes + 主 page**。

## 你要做的事（按優先順序）

### Sub-task R10-1：寫 5 個 entity hooks（10 分鐘）

照 `src/data/entities/ai-agents.ts` 範本、寫 5 個：

1. `src/data/entities/document-types.ts` — document_types 字典
2. `src/data/entities/application-service-types.ts` — application_service_types 字典
3. `src/data/entities/customer-documents.ts` — customer_documents 主檔
4. `src/data/entities/supplier-pricing.ts` — supplier_pricing 含版本
5. `src/data/entities/customer-document-applications.ts` — applications + history

**每個檔範本**：
```typescript
'use client'
import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type DocumentType = Database['public']['Tables']['document_types']['Row']

const documentTypeEntity = createEntityHook<DocumentType>('document_types', {
  list: { select: '*', orderBy: { column: 'sort_order', ascending: true } },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useDocumentTypes = documentTypeEntity.useList
export const useDocumentType = documentTypeEntity.useDetail
export const invalidateDocumentTypes = documentTypeEntity.invalidate
export const createDocumentType = documentTypeEntity.create
export const updateDocumentType = documentTypeEntity.update
export const deleteDocumentType = documentTypeEntity.delete
```

**注意**：
- customer_documents.id 是 uuid、但 customer_id 是 text（特例）
- customer_document_applications 有 status state machine + L4 lock trigger、UI 注意 collected 後不可改重要欄位
- entity hook **不知道** L4 lock、只負責 CRUD、客戶端跟伺服器端各自處理

### Sub-task R10-2：更新 entities/index.ts 加 re-export（2 分鐘）

```typescript
export { useDocumentTypes, useDocumentType, invalidateDocumentTypes, ... } from './document-types'
// ... 4 個檔同樣
```

### Sub-task R10-3：寫主 page（20 分鐘）

`src/app/(main)/visas/page.tsx` 改成完整功能：
- 申辦進度列表（從 customer_document_applications 撈、狀態分組）
- 「新增申辦」button + dialog form
- 表頭篩選：狀態、代辦商、月份
- 列要顯示：客戶名 / 證件 / 服務 / 代辦商 / 狀態 / 送件日 / 預估取件日

**用既有 components**：
- `ListPageLayout` / `EnhancedTable`（看其他 page 範本）
- `FormDialog`（必傳 loading prop）
- 莫蘭迪色系、不用 Tailwind 預設色

**FK type 對照**（types.ts）：
- customer_id: text（指 customers.id）
- tour_id: text（指 tours.id）
- order_id: text（指 orders.id）
- order_member_id: uuid（指 order_members.id）
- 其他 FK: uuid

### Sub-task R10-4：寫核心 API routes（20 分鐘）

最少做這 5 個（CRUD）：
- `src/app/api/customer-document-applications/route.ts`（GET list / POST create）
- `src/app/api/customer-document-applications/[id]/route.ts`（GET / PATCH / DELETE）
- `src/app/api/customer-documents/route.ts`（GET list / POST）
- `src/app/api/document-types/route.ts`（GET list / POST / PATCH / DELETE 字典管理）
- `src/app/api/supplier-pricing/route.ts`（GET list / POST）

**用既有 patterns**：
- `requireCapability(...)` 守門（看 src/lib/auth/require-capability.ts）
- `dbErrorResponse(err)` 翻錯誤
- `recordApiAuditContext()` audit

---

## 紀律（跟前面 Round 同）

- ❌ 不 push、不 --no-verify、不 as any、不 git add -A
- ❌ 不動 .mcp.json（保留 GitHub 認識的舊 token、避免 secret scanning 擋）
- ✅ type-check + lint 必過
- ✅ 每個 sub-task 獨立 commit、commit message 標 Round 10
- ✅ 卡住跳過、不要連續燒 token

---

## 收工

寫 Round 10 段進 OVERNIGHT-LEARNINGS、最後 commit 標 `audit(round-10): 簽證代辦完整 UI/API 衝刺完成`、停手。

---

**Round 9 已 apply 5 個 migration、/visas placeholder 上線。看到「Round 10 繼續推進」立刻開工。**
