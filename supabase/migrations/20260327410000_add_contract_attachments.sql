-- 合約附件選項欄位
-- 允許業務選擇是否在合約中附上名單和行程表

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS include_member_list BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_itinerary BOOLEAN DEFAULT false;

COMMENT ON COLUMN contracts.include_member_list IS '是否附上團員名單';
COMMENT ON COLUMN contracts.include_itinerary IS '是否附上行程表';
