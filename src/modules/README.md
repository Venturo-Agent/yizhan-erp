# `src/modules/` — Module Single Source of Truth

> 一個 module 一個檔、5 個 SSOT（features / module-tabs / capabilities / sidebar / seed）從這個檔衍生。
> 跟 `setup_*_rls` procedure 同一個哲學：抽象掉重複、未來新 module 一個檔搞定。

---

## 為什麼

過去 5/12 channels 踩過：做了 features + capabilities + 路由 + seed migration 但**漏 module-tabs.ts**、HR `/hr/roles` 看不到 channels 可勾。
5/13 audit:rls 跑出：DB `role_capabilities` 有 140 條 distinct capability、`capabilities.ts` 只 40 條常數、**差 100 條散刻字串**全站。

根因：**5 SSOT 互相對齊**靠記憶、會 drift。

解法：**抽象成 1 個 SSOT**（這個目錄）、其餘 5 個檔從這裡衍生。

---

## 怎麼寫一個 module

```ts
// src/modules/tours.ts
import { defineModule } from './_define'

export const ToursModule = defineModule({
  code: 'tours',
  name: '旅遊團管理',
  category: 'basic',
  routes: ['/tours', '/tours/[code]'],
  exposedToHr: true,           // 列在 HR /hr/roles UI 給 admin 勾權限
  defaultRoles: ['admin', 'sales'],   // seed migration 預設給這些 role
  moduleLevelCapabilities: ['read', 'write'],   // tours.read / tours.write
  tabs: [
    { code: 'overview', name: '總覽' },
    { code: 'itinerary', name: '行程' },
    { code: 'contract', name: '合約', category: 'premium' },
    { code: 'as_sales', name: '可當業務', isEligibility: true },  // 只衍生 .write
  ],
})
```

衍生規則（`_define.ts` 內 `deriveCapabilityCodes()`）：
- `tours.read` + `tours.write`（module-level）
- `tours.overview.read` + `tours.overview.write`（tab、預設）
- `tours.contract.read` + `tours.contract.write`（tab + premium 是 workspace_features 用、不影響 capability）
- `tours.as_sales.write`（eligibility tab、只 write）

---

## 紀律（鐵則）

1. **新 module / 改 module 只改 `src/modules/<code>.ts`**、不直接動 `features.ts` / `module-tabs.ts` / `capabilities.ts`
2. **改完跑 `npm run audit:rls`**、確認衍生對齊（CI 也自動跑）
3. Phase 2 codegen 完成後：3 個 SSOT 檔變 `@generated`、改完要跑 `npm run codegen:permissions` 同步
4. **不准**散刻 `'tours.member.read'` 之類字串在 API route — 改用 `import { ToursModule } from '@/modules/tours'` 或之後的 `CAPABILITIES` const
5. **不准** module 跨檔 import（譬如 `modules/finance.ts` 不准 import `modules/tours.ts`）— 各自獨立

---

## Migration Phase

- ✅ **Phase 1（5/13 完工）**：modules/ 目錄立、18 個 module 寫完、audit:rls 從這裡 parse
- ⏸ **Phase 2（下次 session）**：寫 `scripts/codegen-permissions.ts`、自動同步 features.ts / module-tabs.ts / capabilities.ts、加 husky pre-commit
- ⏸ **Phase 3（之後）**：caller 改用 modules 直接 import、廢棄 3 個 SSOT 檔
- ⏸ **Phase 4（長期）**：sidebar 從 modules 衍生、seed migration template 自動生

---

## 跟其他抽象層的對齊

| 重複場景 | 抽象層 | 一個地方寫一次 |
|---|---|---|
| 編號生成 | `@/lib/codes.ts` | 11 種 RPC、全站 caller 走它 |
| 錯誤翻譯 | `@/lib/db-error-translate.ts` | PG 錯誤碼翻中文業務語言 |
| RLS pattern | `setup_*_rls` procedure × 3 | 1 行 CALL 取代 16 條 CREATE POLICY |
| **Module 定義** | **`src/modules/<code>.ts`** | **本檔、1 個檔取代 5 SSOT** |

威廉常說：**寫一個 root helper、跨頁 bug 一次清**。modules/ 就是那個 root helper。
