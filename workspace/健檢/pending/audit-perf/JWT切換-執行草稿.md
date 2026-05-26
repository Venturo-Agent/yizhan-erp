# JWT 本地驗切換 — 執行草稿（code 改動已釘死、等 dashboard 切完即可套）

> 2026-05-23 主 Claude 調查完成。對應 `04-auth-chain.md` 的「leverage 1」+ `SOP-William-Supabase-Dashboard-JWT切換.md`。
> ✏️ **狀態更新（2026-05-23）：code 已完成。** WebFetch 查 JWKS 確認 production 早就是 ES256（Current key `a5e59ea0...`、不需 dashboard 切換），6 處 `getUser()`→`getClaims()` 已套用、type-check + lint 綠、dev server 實測通過（getServerAuth 正確取 claims、proxy 3-9ms）。待部署上線。下方為當初的執行計畫、保留為技術記錄。

---

## 為什麼

每個請求都打 `supabase.auth.getUser()` → fetch 外部 GoTrue（Tokyo↔Singapore RTT 30-80ms）、且一次 request 打 2 次（proxy + getServerAuth）。
改成 `getClaims()`（JWKS 本地 WebCrypto 驗簽、1-3ms）省 54-154ms / request。
**前提**：Supabase project 必須先切 asymmetric（ES256/RS256）。仍是 HS256 時 `getClaims()` 會 fallback 打 GoTrue = 等於沒省。

---

## 已驗證的事實（2026-05-23）

- 裝的 `@supabase/auth-js@2.89.0` 已內建 `getClaims()`、`@supabase/ssr@0.8.0` 也 ready。不用升版。
- `getClaims()` 回傳形狀（node_modules 查證）：
  ```ts
  { data: { claims: JwtPayload; header; signature }; error: null }
    | { data: null; error: AuthError }
    | { data: null; error: null }   // 沒登入 / 沒 JWT
  ```
  `JwtPayload`：`sub`(=user.id, 必有) / `email?` / `user_metadata?` / `app_metadata?` / `exp` / `role` …
- **下游安全**：`getServerAuth` 被 40+ route 用、但對回傳的 `.user` **只存取 `.id`**（grep 確認：countries/banks/airports/ocr 都是 `auth.data.user.id`、無人用 `User` 冷門欄位）→ 把 `user` 型別從 `User` 收窄成 `{ id; email?; user_metadata }` **不會波及那 40 個 route**（type-check 會兜底）。

## 熱點 6 處（每 request 跑、要改）

| #   | 檔案:行                                 | 函式                                 | 用到的欄位                      |
| --- | --------------------------------------- | ------------------------------------ | ------------------------------- |
| 1   | `src/proxy.ts:114`                      | `isAuthenticated`                    | 只要 boolean                    |
| 2   | `src/lib/auth/server-auth.ts:43`        | `getServerAuth`                      | id / email(log) / user_metadata |
| 3   | `src/lib/auth/server-auth.ts:134`       | `_getServerUser`（`_` 前綴、疑未用） | 只要存在                        |
| 4   | `src/lib/auth/get-api-context.ts:66`    | `getApiContext`                      | id                              |
| 5   | `src/lib/auth/get-layout-context.ts:67` | `getLayoutContext`                   | id                              |
| 6   | `src/lib/supabase/api-client.ts:55`     | `getCurrentWorkspaceId`              | id / user_metadata              |

**不動**（非每-request 熱路徑）：`src/app/api/auth/sync-employee/route.ts:39,50`（同步、:39 傳 access_token）、`src/app/(main)/login/page.tsx:67`（client 端、登入後一次性）。

## 改法 pattern

```ts
// before
const {
  data: { user },
  error,
} = await supabase.auth.getUser()
if (error || !user) {
  /* 未登入 */
}
// ...用 user.id / user.email / user.user_metadata

// after
const { data, error } = await supabase.auth.getClaims()
const claims = data?.claims
if (error || !claims) {
  /* 未登入 */
}
// ...用 claims.sub / claims.email / claims.user_metadata
```

`server-auth.ts`：`interface ServerAuthResult.user` 從 `User` 改成 `{ id: string; email?: string; user_metadata: Record<string, unknown> }`；`import { User }` 移除；return 時 `user: { id: claims.sub, email: claims.email, user_metadata: claims.user_metadata ?? {} }`。

## 套用後驗收（William 說「切了」之後）

1. `npx playwright test tests/e2e/login-api.spec.ts`（紅線 A：確認沒人被擋在門外、4/20 事故防線）
2. `npm run type-check`（確認 40 route 沒被型別波及）
3. `npm run lint`
4. commit（訊息講 WHY：本地驗省跨國 RTT）+ push → Coolify 自動部署
5. 部署後實測：登入 + 點幾個按鈕、體感是否快 50-150ms

## 回退

- dashboard 切回 HS256 → `getClaims()` 自動 fallback、code 不用回退（只是沒省）
- 真要回 code：git revert 該 commit

---

_狀態：等 William dashboard 切 ES256。切完套用即可。_
