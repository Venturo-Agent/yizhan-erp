---
title: Shared Data — 飯店事實目錄 + 國內飯店業者 CRM 規格
created: 2026-05-11
owner: William
status: 待 William 拍板、拍板後 Logan 動工
related:
  - "[[2026-05-11-公共資源管理-規格]]"
  - "[[2026-05-10-圓桌會議-開發方向方針規範]]"
---

# Shared Data — 飯店事實目錄 + 國內飯店業者 CRM 規格

> 在 [[2026-05-11-公共資源管理-規格]] 既有基礎上、把 `/shared-data/hotels` 子頁正式落地、並新增 `/shared-data/domestic-hotels` 國內業者 CRM。
>
> **不引入「漫途獨佔」概念**、完全沿用 `workspace_features + role_capabilities + RLS` 三層、漫途只是「剛好現在開了 feature 的 workspace」。

## 0. 背景與決策過程

William 要在 yizhan-erp 做兩件事、source 是交通部觀光署旅宿網的開放 JSON：

- **路由 1**：全台飯店事實目錄（直接接觸過交通部開放資料、3,296 家旅館、不含民宿）
- **路由 2**：國內飯店業者管理（漫途主動經營的合作關係、含聯繫 / LINE / 業務員 / 合作狀態）

W 拍板的設計原則：
- 兩個路由都進 `/shared-data`（事實 + 名單都是公共資源層）
- `/library` 留給「經營資料庫」（客戶 / 訂單 / 行程 / 合約這類各 workspace 自管的東西）
- **完全不寫「獨佔 / admin / 特權」邏輯** — 走 feature + capability + RLS、漫途靠 seed 預先擁有 capability、其他 workspace 未來開通自然取得
- 業者 CRM 跟事實目錄 **拆獨立 capability**（`shared_data_business` feature、未來別 workspace 可只開事實層、不拿合作關係）

## 1. 範圍

| 路由 | 性質 | 資料源 | feature | 主表 |
|---|---|---|---|---|
| `/shared-data/hotels` | 事實目錄、外部同步 | 交通部觀光署 JSON | `shared_data_content`（已存在）| `public.hotels`（已存在） |
| `/shared-data/domestic-hotels` | 業者 CRM、漫途維護 | 漫途自家經營 | `shared_data_business`（新增）| `public.domestic_hotel_partners`（新增）+ 接 hotels / suppliers |

## 2. Schema 改動

### 2-1 `public.hotels` 加 motc 同步欄位

```sql
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS external_source text,           -- 'motc-twstay' / 'manual' / 'legacy'
  ADD COLUMN IF NOT EXISTS external_id text,               -- motc 的 Id（如 'C4_A15010000H_000008'）
  ADD COLUMN IF NOT EXISTS class_code smallint,            -- 1=國際觀光 2=一般觀光 3=一般旅館 4=民宿
  ADD COLUMN IF NOT EXISTS class_label text,               -- 中文標籤（國際觀光旅館 / 一般觀光旅館 / 一般旅館 / 民宿）
  ADD COLUMN IF NOT EXISTS price_low integer,              -- 最低參考價
  ADD COLUMN IF NOT EXISTS price_ceiling integer,          -- 最高參考價
  ADD COLUMN IF NOT EXISTS total_rooms integer,
  ADD COLUMN IF NOT EXISTS total_capacity integer,
  ADD COLUMN IF NOT EXISTS accessibility_rooms integer,
  ADD COLUMN IF NOT EXISTS parking_space integer,
  ADD COLUMN IF NOT EXISTS services jsonb,                 -- 設施清單
  ADD COLUMN IF NOT EXISTS pictures jsonb,                 -- [{url, desc}]
  ADD COLUMN IF NOT EXISTS source_raw jsonb,               -- 完整原始 JSON、保險用
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS hotels_external_uq
  ON public.hotels (external_source, external_id)
  WHERE external_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hotels_region ON public.hotels (region);
CREATE INDEX IF NOT EXISTS idx_hotels_class ON public.hotels (class_code);
```

> ⚠️ TBD：`region` 欄位現況是 text 還是 FK 到 ref_countries / ref_regions、Logan apply 前確認。motc 給的是「南投縣」這種繁體中文、若是 FK 要做 mapping。

### 2-2 新增 feature `shared_data_business`

```sql
INSERT INTO public.feature_definitions (code, name, category, default_enabled) VALUES
  ('shared_data_business', '共用資料 - 業者經營', 'shared', false);

INSERT INTO public.workspace_features (workspace_id, feature_code, enabled) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'shared_data_business', true)
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;
```

> ⚠️ TBD：`feature_definitions` 表名 / 欄位、跟前一份規格同樣的 TBD、Logan 對齊後確認。

### 2-3 新增 capability（4 條）

```
shared_data.domestic_hotels.read
shared_data.domestic_hotels.write
shared_data.domestic_hotels.contact_view    -- 看聯絡資訊（LINE / Email / 電話）
shared_data.domestic_hotels.terms_view      -- 看議價 / 利潤 / 內部備註
```

理由：拆 4 條而不是 2 條 read/write、是因為「合作條件 / 議價」未來可能要分權給某些 role 看不到、預留欄位粒度。**本期 4 條全給漫途 admin role**（`7829922c-dcdf-4d31-871a-d8780b8cfc52`）。

```sql
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT '7829922c-dcdf-4d31-871a-d8780b8cfc52'::uuid, code, true
FROM (VALUES
  ('shared_data.domestic_hotels.read'),
  ('shared_data.domestic_hotels.write'),
  ('shared_data.domestic_hotels.contact_view'),
  ('shared_data.domestic_hotels.terms_view')
) AS caps(code)
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;
```

### 2-4 新增 `public.domestic_hotel_partners` 業者 CRM 表

```sql
CREATE TABLE public.domestic_hotel_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  -- 一個飯店可能多個業者代理（OTA + 直接合作 + 旅行社代訂）、所以 hotel_id 不 unique

  -- 關係欄位（漫途自管）
  relation_status text NOT NULL DEFAULT 'prospect',
    -- prospect 接洽中 / negotiating 議價中 / active 合作中 / paused 暫停 / archived 結案
  primary_contact_name text,
  primary_contact_role text,                  -- 業務 / 訂房 / 老闆 / 經理
  primary_contact_phone text,
  primary_contact_line_id text,
  primary_contact_email text,

  -- 漫途內部
  account_employee_id uuid REFERENCES public.employees(id),  -- 負責業務員
  negotiated_terms jsonb,                     -- {commission_pct, special_rates, payment_terms, ...}
  internal_notes text,
  tags text[],

  -- 通訊
  last_contacted_at timestamptz,
  next_followup_at timestamptz,

  -- audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_workspace_id uuid,
  created_by_user_id uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX idx_domestic_hotel_partners_hotel ON public.domestic_hotel_partners (hotel_id);
CREATE INDEX idx_domestic_hotel_partners_status ON public.domestic_hotel_partners (relation_status);
CREATE INDEX idx_domestic_hotel_partners_account ON public.domestic_hotel_partners (account_employee_id);
```

**為什麼新表、不直接擴 suppliers**：
- suppliers 是泛用業者表（飯店 / 餐廳 / 巴士 / 航空 / 景點 / 其他都共用）、不該塞「飯店專屬合作條件」
- 而 `hotel_id` FK 到 hotels、是這張表存在的核心理由（事實層 + 關係層 join）
- supplier_id 仍可選填、用來把這個合作關係跟既有的 suppliers 主檔（含銀行 / 統編 / 地址）連起來

### 2-5 RLS

```sql
ALTER TABLE public.domestic_hotel_partners ENABLE ROW LEVEL SECURITY;

-- SELECT：要 read capability
CREATE POLICY domestic_hotel_partners_select ON public.domestic_hotel_partners
  FOR SELECT TO authenticated USING (
    has_capability_for_workspace(auth.uid(), 'shared_data.domestic_hotels.read')
  );

-- INSERT/UPDATE/DELETE：要 write capability
CREATE POLICY domestic_hotel_partners_write ON public.domestic_hotel_partners
  FOR ALL TO authenticated
  USING (
    has_capability_for_workspace(auth.uid(), 'shared_data.domestic_hotels.write')
  )
  WITH CHECK (
    has_capability_for_workspace(auth.uid(), 'shared_data.domestic_hotels.write')
  );
```

**`hotels` 既有 RLS 不動**（前一份規格已設好 SELECT 全 authenticated 通、INSERT/UPDATE/DELETE 看 `shared_data.hotels.write`）。

> ⚠️ TBD：`contact_view` / `terms_view` 兩個細粒度 capability 本期先建、但 RLS 不過濾欄位。未來真要分權時、改用 view 過濾敏感欄位、或在 API layer 過濾。**本期 API layer 直接全欄位回傳給有 read capability 的人**。

## 3. 同步機制（motc → public.hotels）

### 3-1 端點 + 篩選

- 來源：`https://media.taiwan.net.tw/XMLReleaseALL_public/hotel_C_f.json`
- 全量：15,616 筆、25MB
- 篩選：`Class IN ('1','2','3')` → 3,296 家旅館（**不含 Class='4' 民宿**、跟 W 拍板對齊）

### 3-2 實作位置

兩個選擇、Logan 選一個：

a. **Edge Function**：`supabase/functions/sync-motc-hotels/index.ts`
   - 用 supabase scheduled function（pg_cron 或 supabase scheduler）每日 03:00 UTC 觸發
   - 優點：跟 yizhan-erp 同 Supabase 專案、無外部依賴

b. **Next.js API route + Vercel cron**：`/api/cron/sync-motc-hotels`
   - vercel.json 加 cron schedule
   - 守 `VENTURO_AIERP_CRON_SECRET`（既有 secret）
   - 優點：好 debug、跟 ERP 同 codebase

> 推薦 b、因為 yizhan-erp 已有 cron secret 機制、好統一管理。

### 3-3 upsert 邏輯（pseudocode）

```typescript
const json = await fetch(MOTC_URL).then(r => r.json())
const hotels = json.XML_Head.Infos.Info
  .filter(h => ['1','2','3'].includes(h.Class))

const classMap = {
  '1': '國際觀光旅館',
  '2': '一般觀光旅館',
  '3': '一般旅館',
}

for (const h of hotels) {
  await supabase.from('hotels').upsert({
    external_source: 'motc-twstay',
    external_id: h.Id,
    name: h.Name,
    address: h.Add,
    region: h.Region,
    // ... 其他欄位 mapping
    class_code: parseInt(h.Class),
    class_label: classMap[h.Class],
    latitude: h.Py,
    longitude: h.Px,
    price_low: h.LowestPrice,
    price_ceiling: h.CeilingPrice,
    total_rooms: h.TotalNumberofRooms,
    total_capacity: h.TotalNumberofPeople,
    accessibility_rooms: h.AccessibilityRooms,
    parking_space: h.ParkingSpace,
    services: { raw: h.Serviceinfo, parking: h.Parkinginfo },
    pictures: [
      { url: h.Picture1, desc: h.Picdescribe1 },
      { url: h.Picture2, desc: h.Picdescribe2 },
      { url: h.Picture3, desc: h.Picdescribe3 },
    ].filter(p => p.url),
    source_raw: h,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'external_source,external_id' })
}
```

> ⚠️ 第一次 apply 前要決定：跟既有 480 筆舊 ERP dump 進來的 hotels 怎麼共處？
> - 舊資料 `external_source IS NULL` → upsert 時不會撞、各自獨立存在
> - 但「同一家飯店在兩邊都有」會出現 → 第二期再做 dedup（手動 / 用名稱 + 地址比對）
> - **本期建議**：直接同步、不 dedup、UI 上加篩選 `external_source = 'motc-twstay'` 看 motc 來源 / `IS NULL` 看舊資料

## 4. UI 路由

### 4-1 `/shared-data/hotels`（事實目錄）

- 沿用 `/library/attractions` 既有 pattern：`AttractionsPage` + `AttractionsList`（EnhancedTable）+ `AttractionsDialog` + 地圖
- 路徑：`src/app/(main)/shared-data/hotels/page.tsx` → `_components/HotelsPage.tsx`
- 功能：
  - 搜尋（name / address）
  - 篩選：region / class_label / external_source（motc / 舊資料 / 手動）
  - 列表欄位：name / region / class_label / total_rooms / price_low~price_ceiling / 最後同步時間
  - 詳情 Dialog：含完整欄位 + 圖片 + 地圖 + 「+ 新增為合作業者」按鈕（要 `shared_data.domestic_hotels.write` capability、按了開啟 domestic_hotel_partners 新增 dialog 預填 hotel_id）
- ModuleGuard：`useFeature('shared_data_content')`

### 4-2 `/shared-data/domestic-hotels`（業者 CRM）

- 不沿用 attractions、是新的 CRM 風格頁
- 路徑：`src/app/(main)/shared-data/domestic-hotels/page.tsx` → `_components/DomesticHotelsPage.tsx`
- 功能：
  - 列表：飯店名 / 業者名 / 負責業務員 / 合作狀態 / 上次聯繫 / 下次跟進
  - 篩選：relation_status / account_employee_id / region（透過 hotels FK join）/ tag
  - 詳情 Dialog（兩欄）：
    - 左欄：hotel 事實資料（從 hotels join、唯讀）
    - 右欄：合作關係欄位（contact / terms / notes / followup）+ 內嵌「LINE 對話」section（接 line_conversations、本期 placeholder、第二期實作）
  - CRUD：可從零建立業者、也可從 `/shared-data/hotels` 詳情頁「+ 新增為合作業者」帶 hotel_id 進來
- ModuleGuard：`useFeature('shared_data_business')`

### 4-3 `/shared-data` 主頁卡片

`src/app/(main)/shared-data/page.tsx` 的 `sharedDataModules` 陣列加：

```typescript
{
  id: 'hotels',
  title: SHARED_DATA_LABELS.MODULE_HOTELS,
  description: SHARED_DATA_LABELS.MODULE_HOTELS_DESC,
  icon: Building2,         // lucide
  href: '/shared-data/hotels',
  color: 'bg-morandi-gold',
  feature: 'shared_data_content',
},
{
  id: 'domestic-hotels',
  title: SHARED_DATA_LABELS.MODULE_DOMESTIC_HOTELS,
  description: SHARED_DATA_LABELS.MODULE_DOMESTIC_HOTELS_DESC,
  icon: Handshake,         // lucide
  href: '/shared-data/domestic-hotels',
  color: 'bg-morandi-red',
  feature: 'shared_data_business',
},
```

主頁渲染時要過濾 `useFeature(m.feature)` 為 false 的卡片不顯示。

### 4-4 Sidebar

`/shared-data` 已在 sidebar、不動。子項是否要展開（hotels / domestic-hotels）視 sidebar 既有設計、Logan 對齊。

## 5. Labels（中央化、不寫死）

`src/app/(main)/shared-data/_constants/labels.ts` 加：

```typescript
export const SHARED_DATA_LABELS = {
  // 既有...
  MODULE_HOTELS: '飯店目錄',
  MODULE_HOTELS_DESC: '全台合法旅館事實資料、來自交通部觀光署、每日同步',
  MODULE_DOMESTIC_HOTELS: '國內飯店業者',
  MODULE_DOMESTIC_HOTELS_DESC: '國內飯店業者經營資料（合作狀態 / 聯繫 / 業務員 / 議價條件）',
}
```

## 6. 待 William 拍板項

1. **同步實作位置**：a. Edge Function vs b. Next.js API route + Vercel cron（建議 b）
2. **舊 ERP 480 筆 hotels 跟 motc 同步資料的關係**：
   - α. 共存、UI 加 source 篩選（建議、最快上線）
   - β. 同步前先比對名稱 + 地址、自動 merge（複雜、第二期再做）
   - γ. 砍掉舊資料、只留 motc（不建議、舊資料可能有手動補的內部備註）
3. **第一波要不要包 LINE 對話面板**：建議**不包**、第一波只做 CRM 名單 + 聯絡資訊管理、LINE section 留 placeholder、第二波接 line_conversations
4. **「+ 新增為合作業者」按鈕**：在 hotels 詳情頁建議**包**（一鍵從事實層帶到 CRM、UX 好）

## 7. 工時跟相依關係

| # | 工作 | 工時 | 相依 |
|---|---|---|---|
| 第一波 | | | |
| 1 | 寫此規格卡 | 完成 | — |
| 2 | migration A：hotels 加 motc 欄位 + index | 30 分 | 1 |
| 3 | migration B：feature + capability + domestic_hotel_partners 表 + RLS | 1 小時 | 1 |
| 第二波（W 拍板後動）| | | |
| 4 | 同步腳本（API route + cron + secret）| 2 小時 | 2 |
| 5 | 第一次手動跑同步、驗證 3,296 筆進來 | 30 分 | 4 |
| 6 | `/shared-data/hotels` 頁（沿用 attractions pattern）| 3 小時 | 5 |
| 7 | `/shared-data/domestic-hotels` 頁（CRM 風格、兩欄 dialog）| 4 小時 | 3 |
| 8 | `/shared-data/page.tsx` 加兩張卡片 + Sidebar 對齊 | 30 分 | 6, 7 |
| 9 | 整體 smoke test + Playwright | 1 小時 | 8 |

**第一波**（不衝既有 cctk 工作）：1.5 小時
**第二波**（W 拍板後動）：11 小時

## 8. 跟前一份規格的關係

[[2026-05-11-公共資源管理-規格]] §5 寫「**內容類本期不做漫途獨立管理頁**」、本份規格把「飯店」這項拉出來提早做（因為 motc 同步源剛好出現、不做 UI 等於資料躺在表裡沒人能查）。其餘景點 / 餐廳維持原規格的「等串機器人時再做」節奏、不一起搬。

---

> 黒羽寫於 2026-05-11、依 William 對話拍板（telegram chat 8559214126、message 280-291）
