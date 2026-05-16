-- Drop 3 orphan modules: members, departments, tour_addons
-- See docs/_session/_orphan_tables_survey.md (questions 3, 4, 6)
--
-- members      : 0 rows, replaced by order_members. useMembers() entity hook actually points to order_members.
-- departments  : 0 rows, comment said "only Jin-Yang uses" but Jin-Yang has 0 rows too. tours.department_id FK depends on this.
-- tour_addons  : 0 rows, 4 months no activity. order_members.add_ons array covers per-person add-ons.

BEGIN;

-- 1. departments: drop FK + column on tours first, then table
ALTER TABLE tours DROP CONSTRAINT IF EXISTS tours_department_id_fkey;
ALTER TABLE tours DROP COLUMN IF EXISTS department_id;
DROP TABLE IF EXISTS departments CASCADE;

-- 2. tour_addons: pure orphan
DROP TABLE IF EXISTS tour_addons CASCADE;

-- 3. members: pure orphan (order_members is the SSOT)
DROP TABLE IF EXISTS members CASCADE;

COMMIT;
