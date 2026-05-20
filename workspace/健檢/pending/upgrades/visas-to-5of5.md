# visas 升級到 5/5 計劃

## 當前分數：4.5/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理✅）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | `visas/page.tsx` 用 `useCustomerDocumentApplications` entity hook；apiMutate 有 |
| **資安** | ✅ | RLS/FK 完整；紅線 B（visas.created_by → employees）✅ |
| **架構** | ✅ | L1-L6 全過；ModuleGuard 有 |
| **開發品管** | ⚠️ | visas 無 realtime e2e（但 apiMutate 有）；eslint suppress 有 |
| **清理** | ✅ | visas 是 Phase 1 清理最完整的 module（5/20 砍表重啟）|

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e — 全鏈路）

**缺口**：visas 無 e2e。

**修法**：
`tests/e2e/visas.spec.ts`：
```
建立簽證申請 → 填寫資料 →
上傳證件 → 確認狀態為「審核中」→
送出申請 → 確認出現在列表 →
狀態變更（通過/駁回）→ 確認即時更新 →
確認 apiMutate 鍊路正確
```

**預估工時**：2-3 小時
**預期難度**：🟡 中

---

### 🟡 Action B（品管 — apiMutate 覆蓋確認）

**缺口**：visas 用 apiMutate 但無 realtime e2e 驗證。

**修法**：
在 Action A 中加入 apiMutate 覆蓋驗證：
```
修改簽證狀態 → 確認列表馬上更新（非等 5 分鐘 cache 過期）
```

**預估工時**：包含在 Action A 中
**預期難度**：🟡 中

---

## 總工時

**2-3 小時**。

---

## 預期難度

🟡 中低。Visas 是 Phase 1 第二健康 module，e2e 價值高。

---

## 推薦執行順序

1. **Action A**：full spec（2-3 小時，一次補完）

---

## 備註

Visas 4.5/5 僅次於 calendar。升 5/5 只需要補 e2e，性價比極高。

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*