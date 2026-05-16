-- 允許 proposal_packages.proposal_id 為 null
-- 用途：直接開團時可以建立獨立的 package（不需要先建立 proposal）

ALTER TABLE proposal_packages 
ALTER COLUMN proposal_id DROP NOT NULL;

-- 更新約束說明
COMMENT ON COLUMN proposal_packages.proposal_id IS '關聯提案 ID（可為 null，支援直接開團建立獨立 package）';
