-- 獎金計算順序設定
-- independent（預設）= OP 跟業務都從同一個淨利計算（舊行為）
-- op_first           = OP 先從淨利算，業務再從（淨利 − OP）算
-- sales_first        = 業務先從淨利算，OP 再從（淨利 − 業務）算

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS bonus_calculation_order TEXT
    NOT NULL DEFAULT 'independent'
    CHECK (bonus_calculation_order IN ('independent', 'op_first', 'sales_first'));
