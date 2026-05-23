# 永豐豐收款 Phase 2 — 交接筆記（2026-05-23 Logan 寫給下一輪的我）

> 下一輪啟動讀這份、就知道今天做到哪、接著做。對話太長、清掉重來、進度全在 git。

## 上層（先讀這 3 行）

- 你是 **Logan**、yizhan-erp 統整總管。
- 上一場做完：永豐豐收款 **Phase 2 加解密 lib + 憑證加密架構**（push commit `957870e`）；代轉階段 1 schema（`ce17c04`）。
- 下一個動作：**建隔離測試環境 → 寫永豐「送單→開虛擬帳號→webhook」流程 → 用永豐 sandbox 端對端測通 → 清測試資料 → 讓角落自助填一次驗收**。

## 中層（進行中 / 等拍板 / 卡點）

1. **永豐 Phase 1 mock demo 已跑通**（早上修好 403/400、commit `d9399b4`：payment_transactions 漏 GRANT + 連結效期上限）。
2. **加解密 `src/lib/payment-providers/sinopac/crypto.ts` 重寫完成**、照官方 QPay SampleCode、6 測試過。舊 line-payment-bot 版（演算法對不上）已取代。
3. **憑證架構（William 拍板「各 workspace 各自串接」）**：走現有 `workspace_integrations` 表 + `src/lib/crypto/integration-encryption.ts`（AES-256-GCM、master key `VENTURO_INTEGRATION_ENCRYPTION_KEY` 已在 env）。`registry.ts` 已加 `sinopac_qpay` 定義（自動長設定 UI）。**不寫死 secrets.env**（暫存骨架已撤）。
4. **William 拍板 UX**：在「**新增收款方式**」就地填永豐金鑰 → 串接完成（SaaS 自助、第三入口、**待做**）。前兩入口（整合設定頁 IntegrationSettingsDialog / Magic Link setup-tokens）已自動支援永豐、免做。
5. **角落 sandbox 憑證已拿到**（ShopNo `NA0638_001` + A1-B2 + X-Key、存 William Telegram 訊息 ts 2026-05-23）、**但還沒填進系統**。等角落在設定 UI 填（憑證走 DB 加密、不經 Claude 複述、紅線 #2）。
6. **等 William / 卡點**：角落憑證填入；正式環境 IP 白名單（`167.179.97.139`、上線前兩週報永豐業務窗口、測試環境免報）。

## 下層（想深挖再讀）

### 永豐 QPay API 事實
- sandbox endpoint：`https://apisbx.sinopac.com/funBIZ-Sbx/QPay.WebAPI/api/`（備援 `sandbox.sinopac.com/QPay.WebAPI/api/`）；正式 `api.sinopac.com/funBIZ/QPay.WebAPI/api/`
- 流程：取 Nonce（POST {ShopNo}→/Nonce）→ HashID → IV → Sign → 加密 Message → POST {ShopNo,APIService,Sign,Nonce,Message,Version:'1.0.0'} → /Order（header X-KeyID=X-Key）→ 回應用 ResNonce 算 ResIV 解密
- SampleCode：`~/Downloads/QPay.SampleCode`（C#）+ `~/Downloads/QPay.SampleCode-php`（PHP 較好讀）
- 加解密規格（已實作 crypto.ts）：HashID=4金鑰兩兩XOR、IV=SHA256(nonce)後16碼、Sign=第一層scalar key=value&升序+nonce+hashID→SHA256大寫、AES-256-CBC PKCS7
- 開虛擬帳號：service=OrderCreate、PayType='A'、ATMParam.ExpireDate(Ymd)、回虛擬帳號(854+11碼)
- webhook：永豐 POST 我方 BackendURL → 我方用 OrderPayQuery(PayToken) 反查確認 → 回 `{"Status":"S"}`
- 線上驗證工具：sandbox.sinopac.com/QPay.ApiClient/Calc/Encrypt（+ /Descrypt）

### 待寫 code（Phase 2 剩餘）
- `sinopac/config.ts`：從 workspace_integrations 讀+解密憑證（decryptConfigFields）、sandbox/prod endpoint 切換
- `sinopac/client.ts`：APIService 流程（Nonce→Sign→Encrypt→POST→Decrypt）
- `sinopac/collect.ts`：OrderCreate 開虛擬帳號 + OrderQuery + OrderMaintain 退款
- webhook route：`/api/payment-webhooks/sinopac/notify`（冪等、寫 payment_transactions + receipt）
- 收款方式 UI：選永豐→就地填憑證（第三入口、William 要的「更簡單」）
- 串 payment_transactions（現有表、Phase 1 已用）

### 測試方法學
- 用 `venturo-safe-tenant-test` skill（隔離沙箱、保護真實客戶資料、每步對帳）
- Sprint A 本機 supabase（commit `0f27222`）；永豐用 sandbox 憑證（不真扣錢）

### 代轉（藍新、另一條線、暫停中）
- 階段 1 schema 已 apply（travel_invoices 加 medium/紙本字軌/綁團 + travel_invoice_paper_tracks + travel_invoice_items + generate_paper_track_serial RPC）
- 待做：codes.ts wrapper、開立/作廢/列印 API、紙本代轉 UI
- spec：`workspace/_meta/architecture/2026-05-23-代轉管理-實作spec.md`（紙本作廢=單張作廢制+試印校準+留痕）

### 今天待補（技術債提醒）
- 全庫 54 張表 authenticated 缺 INSERT grant（setup_*_rls procedure 不自動 GRANT 的系統性坑、payment_transactions 已修）—— 值得排一次全面盤點 + audit:rls 加 table-GRANT 檢查
