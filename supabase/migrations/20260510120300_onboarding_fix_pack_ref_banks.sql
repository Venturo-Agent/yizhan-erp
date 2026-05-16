-- ============================================================================
-- Migration: Onboarding fix pack #4 — 台灣銀行代號 master 表
-- Date: 2026-05-10
-- 來源：財金資訊、央行公布的全國銀行代號表
-- 用途：公司銀行 / 銀行帳戶 / 供應商銀行 三處 Combobox
-- 注意：本表是「全域」資源、不掛 workspace_id（所有租戶共用）
-- ============================================================================

CREATE TABLE IF NOT EXISTS ref_banks (
  bank_code VARCHAR(3) PRIMARY KEY,                -- 三碼銀行代號
  bank_name TEXT NOT NULL,                         -- 中文名
  english_name TEXT,                               -- 英文名（可空）
  swift_code VARCHAR(11),                          -- SWIFT（跨國轉帳用、可空）
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_banks_active ON ref_banks(is_active, display_order);

COMMENT ON TABLE ref_banks IS '台灣銀行代號 master（全域）— 三處 Combobox 共用：公司銀行 / 銀行帳戶 / 供應商銀行';
COMMENT ON COLUMN ref_banks.bank_code IS '三碼銀行代號（004 / 822 / 等）';
COMMENT ON COLUMN ref_banks.swift_code IS 'SWIFT code（外幣轉帳用、選填）';

-- ============================================================================
-- Seed: 全國金融機構代號表（公開資料、財金資訊 / 央行公布）
-- 範圍：本國銀行 + 主要外商銀行 + 信合社總社 + 中華郵政
-- 共 ~80 家總行（不含分行）
-- ============================================================================

INSERT INTO ref_banks (bank_code, bank_name, english_name, swift_code, display_order) VALUES
  ('004', '臺灣銀行', 'Bank of Taiwan', 'BKTWTWTP', 4),
  ('005', '臺灣土地銀行', 'Land Bank of Taiwan', 'LBOTTWTP', 5),
  ('006', '合作金庫商業銀行', 'Taiwan Cooperative Bank', 'TACBTWTP', 6),
  ('007', '第一商業銀行', 'First Commercial Bank', 'FCBKTWTP', 7),
  ('008', '華南商業銀行', 'Hua Nan Commercial Bank', 'HNBKTWTP', 8),
  ('009', '彰化商業銀行', 'Chang Hwa Commercial Bank', 'CCBCTWTP', 9),
  ('011', '上海商業儲蓄銀行', 'Shanghai Commercial & Savings Bank', 'SCSBTWTP', 11),
  ('012', '台北富邦商業銀行', 'Taipei Fubon Commercial Bank', 'TPBKTWTP', 12),
  ('013', '國泰世華商業銀行', 'Cathay United Bank', 'UWCBTWTP', 13),
  ('016', '高雄銀行', 'Bank of Kaohsiung', 'BKAOTWTH', 16),
  ('017', '兆豐國際商業銀行', 'Mega International Commercial Bank', 'ICBCTWTP', 17),
  ('018', '中國農民銀行', 'Farmers Bank of China', NULL, 18),
  ('021', '花旗(台灣)商業銀行', 'Citibank Taiwan', 'CITITWTX', 21),
  ('022', '美商美國銀行台北分行', 'Bank of America Taipei Branch', 'BOFATWTP', 22),
  ('024', '美商JP摩根大通銀行', 'JPMorgan Chase Bank Taipei Branch', 'CHASTWTX', 24),
  ('025', '美商道富銀行', 'State Street Bank Taipei Branch', 'SBOSTWTX', 25),
  ('028', '香港商東亞銀行', 'Bank of East Asia Taipei', 'BEASTWTP', 28),
  ('030', '美商紐約梅隆銀行', 'Bank of New York Mellon', 'IRVTTWTX', 30),
  ('037', '法商法國興業銀行', 'Société Générale Taipei Branch', 'SOGETWTX', 37),
  ('039', '澳商澳盛銀行', 'ANZ Bank Taipei Branch', 'ANZBTWTX', 39),
  ('040', '中華開發工業銀行', 'China Development Industrial Bank', 'CDIBTWTP', 40),
  ('048', '王道商業銀行', 'O-Bank', 'APBKTWTH', 48),
  ('050', '臺灣中小企業銀行', 'Taiwan Business Bank', 'MBBTTWTP', 50),
  ('052', '渣打國際商業銀行', 'Standard Chartered Bank Taiwan', 'SCSBTWTP', 52),
  ('053', '台中商業銀行', 'Taichung Commercial Bank', 'TCBBTWTH', 53),
  ('054', '京城商業銀行', 'King''s Town Bank', 'UBOTTWTP', 54),
  ('072', '德商德意志銀行', 'Deutsche Bank Taipei Branch', 'DEUTTWTP', 72),
  ('075', '香港商東亞銀行', 'Bank of East Asia', NULL, 75),
  ('076', '香港商滙豐(台灣)商業銀行', 'HSBC Bank (Taiwan)', 'HSBCTWTP', 76),
  ('081', '滙豐(台灣)商業銀行', 'HSBC Bank Taiwan', 'HSBCTWTP', 81),
  ('082', '法商法國巴黎銀行', 'BNP Paribas Taipei Branch', 'BNPATWTX', 82),
  ('085', '新加坡商新加坡華僑銀行', 'OCBC Singapore Taipei Branch', 'OCBCTWTP', 85),
  ('086', '法商東方匯理銀行', 'Crédit Agricole Taipei Branch', 'AGRITWTX', 86),
  ('092', '瑞士商瑞士銀行', 'UBS AG Taipei Branch', 'UBSWTWTX', 92),
  ('093', '荷蘭商安智銀行', 'ING Bank Taipei Branch', 'INGBTWTX', 93),
  ('097', '美商富國銀行', 'Wells Fargo Bank Taipei', 'PNBPTWTX', 97),
  ('101', '瑞興商業銀行', 'COTA Commercial Bank', 'COTBTWTH', 101),
  ('102', '華泰商業銀行', 'Hwatai Bank', 'HWATTWTP', 102),
  ('103', '臺灣新光商業銀行', 'Shin Kong Commercial Bank', 'SKCBTWTP', 103),
  ('108', '陽信商業銀行', 'Sunny Bank', 'SUNYTWTP', 108),
  ('114', '基隆第一信用合作社', 'First Credit Cooperative of Keelung', NULL, 114),
  ('118', '板信商業銀行', 'Bank of Panhsin', 'BOPATWTP', 118),
  ('120', '新北市淡水第一信用合作社', 'Tamsui First Credit Cooperative', NULL, 120),
  ('147', '三信商業銀行', 'Cosmos Bank', 'COSMTWTP', 147),
  ('204', '香港商法國興業銀行', 'Société Générale HK Branch', NULL, 204),
  ('215', '澳盛(台灣)商業銀行', 'ANZ Bank (Taiwan)', 'ANZBTWTX', 215),
  ('216', '美商花旗銀行(台灣)', 'Citibank Taiwan', 'CITITWTX', 216),
  ('218', '加拿大商豐業銀行', 'Bank of Nova Scotia Taipei', 'NOSCTWTP', 218),
  ('301', '美商道富銀行台北分行', 'State Street Bank Taipei', 'SBOSTWTX', 301),
  ('314', '南非商南非標準銀行', 'Standard Bank of South Africa', NULL, 314),
  ('321', '日商三菱日聯銀行', 'MUFG Bank Taipei Branch', 'BOTKTWTX', 321),
  ('324', '日商三井住友銀行', 'Sumitomo Mitsui Banking Corp', 'SMBCTWTW', 324),
  ('325', '日商瑞穗銀行', 'Mizuho Bank Taipei Branch', 'MHCBTWTP', 325),
  ('326', '美商花旗銀行', 'Citibank N.A.', NULL, 326),
  ('328', '韓商韓亞銀行', 'KEB Hana Bank Taipei', 'KOEXTWTP', 328),
  ('329', '印尼商印尼人民銀行', 'Bank Rakyat Indonesia', NULL, 329),
  ('330', '菲商菲律賓首都銀行', 'Metropolitan Bank Taipei', 'MBTCTWTP', 330),
  ('337', '韓商國民銀行', 'Kookmin Bank Taipei', 'CZNBTWTP', 337),
  ('700', '中華郵政', 'Chunghwa Post', 'PSPCTWTP', 700),
  ('803', '聯邦商業銀行', 'Union Bank of Taiwan', 'UBOTTWTP', 803),
  ('805', '遠東國際商業銀行', 'Far Eastern International Bank', 'FEINTWTP', 805),
  ('806', '元大商業銀行', 'Yuanta Commercial Bank', 'APBKTWTH', 806),
  ('807', '永豐商業銀行', 'Bank SinoPac', 'SINOTWTP', 807),
  ('808', '玉山商業銀行', 'E.SUN Commercial Bank', 'ESUNTWTP', 808),
  ('809', '凱基商業銀行', 'KGI Bank', 'UWCBTWTP', 809),
  ('810', '星展(台灣)商業銀行', 'DBS Bank (Taiwan)', 'DBSSTWTP', 810),
  ('812', '台新國際商業銀行', 'Taishin International Bank', 'TSIBTWTP', 812),
  ('814', '大眾商業銀行', 'Ta Chong Bank', 'TCBKTWTP', 814),
  ('815', '日盛國際商業銀行', 'Jih Sun International Bank', 'JSIBTWTP', 815),
  ('816', '安泰商業銀行', 'Entie Commercial Bank', 'ENTITWTP', 816),
  ('822', '中國信託商業銀行', 'CTBC Bank', 'CTCBTWTP', 822),
  ('823', '將來商業銀行', 'NEXT Commercial Bank', 'NCBKTWTP', 823),
  ('824', '連線商業銀行', 'LINE Bank Taiwan', 'LINBTWTP', 824),
  ('826', '樂天國際商業銀行', 'Rakuten International Commercial Bank', 'RICBTWTP', 826)
ON CONFLICT (bank_code) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  english_name = EXCLUDED.english_name,
  swift_code = EXCLUDED.swift_code,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- 啟用 RLS、所有登入者都能讀（master 資料、不分租戶）
ALTER TABLE ref_banks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ref_banks' AND policyname = 'ref_banks_read_all'
  ) THEN
    CREATE POLICY ref_banks_read_all ON ref_banks
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;
