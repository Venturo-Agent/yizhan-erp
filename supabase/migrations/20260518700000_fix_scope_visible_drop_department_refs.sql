-- 2026-05-18 修 scope_visible 睡眠 bug
--
-- 譬喻：守門員工作手冊還在翻「員工識別證的部門欄位」、但部門欄位 5/14 已被拿掉
-- → 員工按下「修改/刪除請款明細」這兩個動作（用此 function 守 RLS）→ panic 報「column does not exist」
--
-- 解法：rewrite function、拿掉所有部門邏輯。
--   - 不再 SELECT e.department_id / e.is_dept_manager
--   - 不再 cross_department.read 雙條件
--   - 不再「部門主管管同部門員工的團」邏輯
--   - 保留 cross_branch.read 跨分公司全看、保留 branch_id 守門
--
-- William 拍板「部門概念留著」：
--   - employees.is_dept_manager column 不砍（DB 層 artifact 保留、之後重建部門時可用）
--   - 但因為 employees.department_id 已砍 → function 內部無法 reference、邏輯必須拿掉
--   - 之後重建部門 schema 時、再加 dept 邏輯回 function
--
-- 受影響 RLS policy（行為自動跟新版 function 走、不用個別改）：
--   - payment_request_items_update
--   - payment_request_items_delete

BEGIN;

CREATE OR REPLACE FUNCTION public.scope_visible(p_module text, p_row_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me UUID;
  v_my_workspace UUID;
  v_my_branch UUID;
BEGIN
  -- 取當前員工身份（branch 二維、部門概念暫不啟用、之後恢復）
  SELECT
    e.id,
    e.workspace_id,
    e.branch_id
  INTO v_me, v_my_workspace, v_my_branch
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1;

  -- 沒員工身份 / 未登入 → 全擋
  IF v_me IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 跨公司 cap = 全部 row 都看
  -- 註：原版要求 cross_branch.read AND cross_department.read 雙條件、
  --     部門邏輯拆掉後簡化為單條件、之後重建部門再加 cross_department.read 條件
  IF public.has_capability_for_workspace(v_my_workspace, 'cross_branch.read') THEN
    RETURN TRUE;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: tours（旅遊團）
  --   能看：自己掛在團上 / 自己是 controller / 同分公司能看
  -- ─────────────────────────────────────────────────────────────────────────
  IF p_module = 'tours' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.tours t
      WHERE t.id = p_row_id
        AND t.workspace_id = v_my_workspace
        AND (
          -- 我是 controller
          t.controller_id = v_me
          -- 我被掛在團的 role assignment 上
          OR EXISTS (
            SELECT 1 FROM public.tour_role_assignments tra
            WHERE tra.tour_id = t.id AND tra.employee_id = v_me
          )
          -- 沒分公司的客戶（branch 全 NULL）= 自動退化看全部
          OR v_my_branch IS NULL
          -- 有分公司：controller 同 branch
          OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = t.controller_id AND e.branch_id = v_my_branch
          )
          -- 或團上掛的員工同 branch
          OR EXISTS (
            SELECT 1 FROM public.tour_role_assignments tra
            JOIN public.employees e ON e.id = tra.employee_id
            WHERE tra.tour_id = t.id AND e.branch_id = v_my_branch
          )
        )
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: orders（訂單）— 繼承 tour scope
  -- ─────────────────────────────────────────────────────────────────────────
  IF p_module = 'orders' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = p_row_id
        AND o.workspace_id = v_my_workspace
        AND public.scope_visible('tours', o.tour_id)
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: payment_requests（請款單）
  -- ─────────────────────────────────────────────────────────────────────────
  IF p_module = 'payment_requests' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.payment_requests pr
      WHERE pr.id::TEXT = p_row_id
        AND pr.workspace_id = v_my_workspace
        AND (
          pr.created_by = v_me
          OR (pr.tour_id IS NOT NULL AND public.scope_visible('tours', pr.tour_id))
        )
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: receipts（收款）
  -- ─────────────────────────────────────────────────────────────────────────
  IF p_module = 'receipts' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.receipts r
      WHERE r.id::TEXT = p_row_id
        AND r.workspace_id = v_my_workspace
        AND (
          r.created_by = v_me
          OR (r.order_id IS NOT NULL AND public.scope_visible('orders', r.order_id))
        )
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: disbursement_orders（出納單）
  -- ─────────────────────────────────────────────────────────────────────────
  IF p_module = 'disbursement_orders' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.disbursement_orders d
      WHERE d.id::TEXT = p_row_id
        AND (
          d.created_by = v_me
          OR d.approved_by = v_me
          OR (
            d.payment_request_id IS NOT NULL
            AND public.scope_visible('payment_requests', d.payment_request_id::TEXT)
          )
        )
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: quotes（報價單）
  -- ─────────────────────────────────────────────────────────────────────────
  IF p_module = 'quotes' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = p_row_id
        AND q.workspace_id = v_my_workspace
        AND (
          q.created_by = v_me
          OR (q.tour_id IS NOT NULL AND public.scope_visible('tours', q.tour_id))
        )
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: order_members（團員）— 繼承 order scope
  -- ─────────────────────────────────────────────────────────────────────────
  IF p_module = 'order_members' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.order_members om
      WHERE om.id = p_row_id
        AND public.scope_visible('orders', om.order_id)
    );
  END IF;

  -- 未知 module → 預設不可見
  RETURN FALSE;
END;
$function$;

COMMIT;

-- ════ Rollback（萬一爆炸、原版見 git log @ 2026-05-10120100_phase_a2_scope_functions.sql）════
-- 不附 reverse SQL — 原版本身就 broken（reference 已砍 column）、退回沒意義。
