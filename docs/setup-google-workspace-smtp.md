# Google Workspace SMTP 接到 Supabase Auth

> 2026-05-23 William 拍板：忘記密碼 / 變更 Email / 驗證信件、改走自己的 SMTP、不用 Supabase 預設
>
> 寄件人變成 `noreply@venturo.tw`（而非 `noreply@mail.app.supabase.io`）、無封數上限

---

## 為什麼

Supabase 預設 SMTP 限制：

- **30 封 / 小時**（free tier）
- 寄件人 `noreply@mail.app.supabase.io`、看起來像詐騙
- 信件常進 spam folder

改自己的 SMTP（Google Workspace）：

- **10,000 封 / 天 / user**（SMTP Relay）
- 寄件人 `noreply@venturo.tw`、客戶信任
- 不會被擋 spam

---

## 步驟（你照做、5-10 分鐘）

### 1. Google Admin Console 開 SMTP Relay

1. 用 Google Workspace 管理員帳號登入 https://admin.google.com
2. **Apps** → **Google Workspace** → **Gmail** → **Routing**
3. 找「**SMTP relay service**」段、點 **Configure**
4. 名稱：`Venturo ERP SMTP`
5. 設定：
   - **Allowed senders**：選 `Only addresses in my domains` → 加 `noreply@venturo.tw`（或你選一個專屬寄件信箱）
   - **Authentication**：勾「**Require SMTP Authentication**」+「**Require TLS encryption**」
   - **IP allowlist**：留空、用 SMTP 驗證即可
6. 儲存

### 2. 建立寄件人專屬 Email + App Password

1. 還是在 Admin Console、Users → 建立 `noreply@venturo.tw`（或選一個現有 email）
2. 設密碼、開 2-Step Verification（必要、不開 App Password 拿不到）
3. 用該帳號登入 https://myaccount.google.com/apppasswords
4. 產生「App Password」、選 App: `Mail`、Device: `Other` → 命名 `Venturo Supabase SMTP`
5. **複製 16 位密碼**（譬如 `abcd efgh ijkl mnop`）— 只會顯示一次、複製存好

### 3. Supabase Dashboard 填 SMTP 設定

1. 登入 https://supabase.com/dashboard
2. 選 yizhan-erp project（ref：`aawrgygqgemgqssflfrx`）
3. **Authentication** → **Email Templates**
4. 拉到下面看「**SMTP Settings**」
5. 勾「**Enable Custom SMTP**」
6. 填：

| 欄位             | 值                                             |
| ---------------- | ---------------------------------------------- |
| **Host**         | `smtp-relay.gmail.com`                         |
| **Port**         | `587`                                          |
| **Min interval** | `60` 秒                                        |
| **Sender email** | `noreply@venturo.tw`                           |
| **Sender name**  | `Venturo ERP`                                  |
| **Username**     | `noreply@venturo.tw`                           |
| **Password**     | 步驟 2 複製的 16 位 App Password（不要有空格） |

7. **Save**

### 4. 測試

1. 進 erp.venturo.tw 登入頁
2. 點「忘記密碼？」→ 填一個你的 email
3. 1 分鐘內看 inbox + spam
4. 寄件人應該是 `Venturo ERP <noreply@venturo.tw>`
5. 點連結進 reset-password 頁面、確認流程完整

如果信件沒到：

- Supabase Dashboard → Logs → Auth Logs 看 send 紀錄
- Google Admin Console → Reports → Email Log Search 看出站紀錄
- Spam folder

---

## 進階：自訂信件範本

Supabase Dashboard → Authentication → Email Templates、有 6 種範本：

- Confirm signup
- Invite user
- Magic link
- Change email
- Reset password
- Reauthentication

每個都可以改 Subject / HTML。建議至少改 Reset password / Change email 兩個、加上 venturo 品牌色 + logo。

範本變數：

- `{{ .ConfirmationURL }}` — 點按連結 URL
- `{{ .Token }}` — token（少用）
- `{{ .SiteURL }}` — 你的 app URL

---

## 安全紀律

- ❌ 不把 App Password 寫進 git
- ✅ App Password 進你的密碼管理器（1Password / Bitwarden）
- ✅ 哪天 SMTP 出問題、轉移到 Resend / SES 不影響 code（Supabase Dashboard 改設定即可）
- ⚠️ Google Workspace 帳號被盜 → 攻擊者能用你 domain 寄釣魚信。2-Step 強制開

---

## Phase 2：若量超過 10,000 封 / 天

兩個方向：

1. **多開幾個 Workspace 帳號**（每個 10k）— 走多 sender 輪流
2. **改用 Resend / SES / Postmark** — 5 萬 / 月免費（Resend）、無限量付費（SES $0.10 / 1000 封）

到時候我再幫你接、SaaS 規模上來才需要。

---

## 紀錄

- 2026-05-23 William 拍板：忘記密碼信走 Google Workspace SMTP、不用 Supabase 預設
- 預期接入時間：**你照這份 5-10 分鐘設完**
