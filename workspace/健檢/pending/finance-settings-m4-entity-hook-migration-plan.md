# M4 計劃卡 — finance/settings page.tsx 切 entity hook + apiMutate

> William 2026-05-21 拍 A「先 commit M1-M3、M4 另開計劃」、本檔即計劃。
> 動之前要 William review 此檔。

---

## 為什麼要做

- 紅線 F 字面違反：`page.tsx` 用 `useState + fetch` 自己管 4 份資料、未走 `createEntityHook`、未走 `apiMutate`
- 後果：
  - 沒走 SWR cache、切走切回又重 fetch
  - 沒走 realtime、別人改了你看不到（雖然設定頁不痛、但屬一致性違反）
  - 沒走 `apiMutate` invalidate、寫入後要 `reload()` 才看到
- 紅線 F 屬 ratchet baseline 系統管控、漸進改、不阻擋 PR、但這頁是「全 finance/settings 唯一漏網」

## 動的檔案

| # | 檔案 | 改什麼 | 風險 |
|---|---|---|---|
| 1 | `src/app/(main)/finance/settings/page.tsx` | 拿掉 4 個 useState + loadData、改 4 個 entity hook 直接讀 | 中 |
| 2 | `src/app/(main)/finance/settings/_components/PaymentMethodsSection.tsx` | 拿掉 `paymentMethods / setPaymentMethods / reload / workspaceId` 4 個 prop、自己 call hook | 中 |
| 3 | `src/app/(main)/finance/settings/_components/BankAccountsSection.tsx` | 同上 pattern | 中 |
| 4 | `src/app/(main)/finance/settings/_components/CategoriesSection.tsx` | 同上 pattern | 中 |

## 寫入路徑改動

**前**：
```ts
const res = await apiMutate('/api/finance/payment-methods', {
  method: 'POST',
  body: {...},
  invalidate: ['/api/finance/payment-methods'],  // ← URL 字串 key
})
if (res.ok) await reload()  // ← 手動重 fetch
```

**後**：
```ts
const res = await apiMutate('/api/finance/payment-methods', {
  method: 'POST',
  body: {...},
  // 不再 invalidate URL string、改 call entity hook invalidate
})
if (res.ok) {
  await invalidatePaymentMethods()  // ← entity hook 內建 SWR key 失效
  setIsDialogOpen(false)
}
```

## 核心 SSOT 矛盾要解決

兩套 cache key 系統並存：
- **A. apiMutate.invalidate** 用「URL 字串」當 key（給 `useSWR(url, fetcher)` 用）
- **B. createEntityHook** 用「`entity:tableName:list:v{hash}`」當內部 SWR key

切到 entity hook 後、apiMutate 不能再用 URL 字串、要 call `invalidateXxx()` function（由 entity hook export）。

## 驗證 checklist（改完必跑）

- [ ] `npm run type-check` 過
- [ ] `npm run lint` 過
- [ ] 開 dev server、進 /finance/settings、7 個 tab 都切過、各看一次資料能載
- [ ] 收款方式：新增 / 編輯 / 拖曳排序 / 啟停 / 刪除（全跑、寫入後 UI 立即反映）
- [ ] 付款方式：同上
- [ ] 銀行帳戶：新增 / 編輯 / 設預設 / 刪除
- [ ] 團體請款類別：新增 / 編輯 / 刪除（這是 Bug #4 同條測試路徑、順便驗證）
- [ ] 公司支出 / 公司收入：新增 / 編輯 / 刪除
- [ ] 跨 tab 寫入後切回：cache 對齊、不是看到舊資料
- [ ] 跨頁刷新：F5 後資料對齊

## 時間估

- 改 4 個檔案：~2 小時
- 驗證 7 個 tab × 各 CRUD：~1.5 小時
- 修可能的 SWR key regression：~0.5 小時
- **合計 ~4 小時**

## 風險

| 風險 | 機率 | 影響 | 緩解 |
|---|---|---|---|
| SWR key 不對齊、寫入後 UI 不更新 | 中 | 中 | 改完每一個 mutation 都實際點一次驗 |
| Entity hook realtime 訂閱跟既有 SWR cache 撞 | 低 | 低 | finance/settings 不開 realtime（設定頁不需即時）|
| Section prop 介面改變、別處 import 編譯失敗 | 低 | 低 | type-check 抓 |

## 不該動的部分

- ✅ API route 邏輯（已修紅線 H、跟 entity hook 切換無關）
- ✅ RLS policy（已修、跟 client 改寫無關）
- ✅ DB schema（M4 不動）

## 觸發條件

William 點頭、且這輪沒其他高優先工作搶資源。
建議搭配「整體重寫 finance/settings UI」一起做、別獨立進場（避免動兩次）。

---

*建立：2026-05-21、Max 寫、William 拍 A 後留檔*
