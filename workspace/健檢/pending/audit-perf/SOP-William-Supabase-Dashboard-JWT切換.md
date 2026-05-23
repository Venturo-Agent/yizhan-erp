# SOP — Supabase Dashboard JWT 切換非對稱簽章

> 2026-05-23、給 William 的 30 秒操作 SOP。
> 這是「刀 1 JWT 本地驗」的 prereq。沒切之前 code 改了等於沒省。

---

## 為什麼要切

現在 Supabase project 的 JWT 用 **HS256 對稱簽章**（單一 secret、伺服器 + 客戶端共用）。
要改成 **RS256 / ES256 非對稱簽章**（公私鑰分開、客戶端只要公鑰就能本地驗）才能讓 `getClaims()` 跑 JWKS 本地驗、省 30-80ms 跨網路打 GoTrue 服務的時間。

---

## 切換代價（William 你拍板）

- ✅ 「現在沒人用」已確認、可立刻切
- ⚠️ 所有現存 JWT token 立刻失效、**所有現有 session 強制登出**、user 下次操作會被導去登入頁
- ⚠️ 客戶下次進來要重新輸入密碼 / 重新打 magic link
- ✅ 切回 HS256 也可以（可逆操作）、不會弄壞資料

---

## 操作步驟（5 步、約 30 秒）

1. 開 Supabase Dashboard：https://supabase.com/dashboard/project/aawrgygqgemgqssflfrx
2. 左側選 **Authentication** → **Configuration** → **JWT Settings**（或 **Settings** → **API** → **JWT Settings**、看 UI 版本）
3. 找「**JWT Algorithm**」欄位、目前是 **HS256**
4. 按「**Migrate JWT secret**」或「**Rotate keys to asymmetric**」按鈕（不同版本叫法不同）
5. 選 **ES256**（建議、最快、比 RS256 省 CPU）或 **RS256**（更通用、保險）

切完會看到「Public JWKS endpoint」URL 出現、表示成功。

---

## 切換後我這邊接著動什麼

1. 我 code 改 4 處：`src/lib/auth/server-auth.ts` / `get-layout-context.ts` / `get-api-context.ts` / `supabase/api-client.ts`
2. 從 `supabase.auth.getUser()` 換成 `supabase.auth.getClaims()`（內建 JWKS 本地驗）
3. type-check + auth e2e test 驗
4. commit + push（Coolify 自動部署）

---

## 如果切完發現有問題（rollback）

- 回 Dashboard、把 JWT Algorithm 切回 HS256
- 我 code 不用改、`getClaims()` 對 HS256 會自動 fallback `getUser()`、繼續可跑（只是沒省時間）
- 24 小時內所有 user 仍要重新登入一次（不可避免）

---

## 你做完跟我講「切了」、我立刻動 code。
