-- 個人記帳功能資料表
-- 記錄個人收支，可選擇性連結到分帳群組
-- 支援 Supabase Auth 用戶和 ERP 員工

BEGIN;

-- 個人支出/收入記錄表
CREATE TABLE IF NOT EXISTS public.personal_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- 可以是 auth.users.id 或 employees.id

  -- 基本資訊
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',

  -- 付款方式
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'mobile_pay', 'transfer', 'other')),

  -- 時間
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  expense_time time,

  -- 分帳整合（可選）
  is_split boolean DEFAULT false,
  split_group_id uuid, -- 移除外鍵，避免依賴問題
  split_expense_id uuid, -- 對應到 split_expenses 的 ID

  -- 標籤和備註
  tags text[],
  receipt_url text, -- 收據照片
  location text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 支出分類表（預設分類 + 用戶自訂）
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- NULL 表示系統預設，可以是 auth.users.id 或 employees.id
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 個人記帳統計表（月度快取）
CREATE TABLE IF NOT EXISTS public.expense_monthly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- 可以是 auth.users.id 或 employees.id
  year_month text NOT NULL, -- 格式: '2026-01'
  total_expense numeric DEFAULT 0,
  total_income numeric DEFAULT 0,
  total_split_paid numeric DEFAULT 0, -- 分帳中我先付的
  total_split_owed numeric DEFAULT 0, -- 分帳中別人要還我的
  category_breakdown jsonb DEFAULT '{}', -- 各分類統計
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year_month)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_personal_expenses_user_id ON public.personal_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_date ON public.personal_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_category ON public.personal_expenses(category);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_split ON public.personal_expenses(is_split, split_group_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON public.expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_monthly_stats_user ON public.expense_monthly_stats(user_id, year_month);

-- RLS（使用 service role 繞過，應用層控制權限）
-- 暫時不啟用 RLS，因為員工登入不使用 auth.uid()
-- 後續可以透過應用層或自訂 RLS 函數來控制

-- 插入預設分類
INSERT INTO public.expense_categories (user_id, name, icon, color, type, sort_order) VALUES
  (NULL, '餐飲', 'restaurant', '#FF6B6B', 'expense', 1),
  (NULL, '交通', 'directions_car', '#4ECDC4', 'expense', 2),
  (NULL, '購物', 'shopping_bag', '#45B7D1', 'expense', 3),
  (NULL, '娛樂', 'movie', '#96CEB4', 'expense', 4),
  (NULL, '住宿', 'hotel', '#FFEAA7', 'expense', 5),
  (NULL, '醫療', 'local_hospital', '#DDA0DD', 'expense', 6),
  (NULL, '教育', 'school', '#98D8C8', 'expense', 7),
  (NULL, '日用品', 'home', '#F7DC6F', 'expense', 8),
  (NULL, '通訊', 'phone', '#BB8FCE', 'expense', 9),
  (NULL, '其他', 'more_horiz', '#95A5A6', 'both', 10),
  (NULL, '薪資', 'payments', '#2ECC71', 'income', 1),
  (NULL, '獎金', 'card_giftcard', '#F39C12', 'income', 2),
  (NULL, '投資', 'trending_up', '#3498DB', 'income', 3),
  (NULL, '退款', 'replay', '#1ABC9C', 'income', 4)
ON CONFLICT DO NOTHING;

COMMIT;
