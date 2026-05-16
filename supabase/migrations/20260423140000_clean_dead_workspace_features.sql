-- 2026-04-23: 清 workspace_features 死 feature_code（對應已砍功能）
-- 不影響 workspace_roles / role_tab_permissions / employees
BEGIN;
DELETE FROM public.workspace_features
WHERE feature_code IN (
  -- 客製化整族（之前砍）
  'customized',
  'wishlist',
  -- esims / fleet / local / office / supplier_portal（功能整族砍）
  'esims',
  'fleet',
  'local',
  'office',
  'supplier_portal',
  -- 確認單 / 需求單 / 旅遊發票（tour_requests + travel-invoice 砍）
  'tours.confirmation-sheet',
  'tours.requirements',
  'finance.travel-invoice',
  -- HR 出勤/請假/薪資（已砍）
  'hr.attendance',
  'hr.leave',
  'hr.payroll',
  -- 客戶擴張（customer_groups 等已砍）
  'database.customer-groups'
);
COMMIT;
