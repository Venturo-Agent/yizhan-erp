-- 清理重複的 DM 頻道（只保留最早建立的一個）

BEGIN;

-- 先刪除重複頻道的成員
DELETE FROM public.channel_members
WHERE channel_id IN (
  SELECT id FROM public.channels
  WHERE name LIKE 'dm:%'
  AND id NOT IN (
    -- 保留每組 DM 中最早建立的
    SELECT DISTINCT ON (name) id
    FROM public.channels
    WHERE name LIKE 'dm:%'
    ORDER BY name, created_at ASC
  )
);

-- 再刪除重複的頻道
DELETE FROM public.channels
WHERE name LIKE 'dm:%'
AND id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM public.channels
  WHERE name LIKE 'dm:%'
  ORDER BY name, created_at ASC
);

COMMIT;
