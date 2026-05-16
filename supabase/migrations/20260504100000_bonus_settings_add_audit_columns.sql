-- 補 created_by / updated_by 欄位
-- 之前缺這兩欄、createEntityHook 預設會注入這兩個欄位、insert 必失敗
-- DB 之前 tour_bonus_settings 有 0 筆紀錄、表示舊 BonusSettingDialog 也從來沒成功存過
-- FK 指 employees(id)、符合 root CLAUDE.md 紅線 #2

ALTER TABLE public.tour_bonus_settings
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.workspace_bonus_defaults
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;
