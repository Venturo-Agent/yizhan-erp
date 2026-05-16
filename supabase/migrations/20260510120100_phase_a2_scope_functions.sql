-- ─────────────────────────────────────────────────────────────────────────────
-- Phase A2: 權限 scope 系統 — 兩個核心 SQL function
--
-- 目的：
--   1. scope_visible(p_module, p_row_id) — 給定 module 跟 row_id、判斷當前
--      auth user 能不能「看」這筆。所有 RLS SELECT policy 之後都走這個
--      function、不准散刻 sales_id = me / created_by = me。
--   2. is_row_editable(p_module, p_row_id) — 給定 module 跟 row_id、判斷這筆
--      row 現在「狀態上能不能改」。RLS UPDATE = scope_visible AND is_row_editable
--      雙守門。
--
-- 業務語境（決策樹）：
--   1. 跨分公司守門：v_my_branch IS NOT NULL AND row 的 branch ≠ v_my_branch
--      → 看不到（除非有 cross_branch.read）
--   2. 跨部門守門：v_is_manager 才看部門 row、否則只看自己 row
--   3. 跨部門 cap：cross_department.read → 看全公司
--   4. 自己 = tour_role_assignments 上有掛我（業務 / 團控等任何 role 類型）
--   5. 老闆 / admin / 系統管理員：沒特權通道、就是「他這個 role 把所有 cap
--      都勾了」、走完全相同的判斷
--
-- function 簽名：p_row_id TEXT
--   原因：tours / orders / quotes / order_members 主鍵是 TEXT；payment_requests
--   / receipts / disbursement_orders 是 UUID。統一用 TEXT、function 內部
--   `id::TEXT = p_row_id` 比對、避免 cast 不一致。
--
-- 紅線檢核：
--   - SECURITY DEFINER：跟既有 has_capability_for_workspace 一致 pattern
--   - STABLE：function 內不寫資料、可被 query optimizer 重用
--   - search_path 固定 public：避免 schema 注入
--   - 本 migration 不動任何既有 RLS、function 建好沒人呼叫、零風險
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- scope_visible(p_module, p_row_id) → BOOLEAN
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.scope_visible(
  p_module TEXT,
  p_row_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID;
  v_my_workspace UUID;
  v_my_branch UUID;
  v_my_dept UUID;
  v_is_manager BOOLEAN;
BEGIN
  -- 取當前員工身份（branch / department / 是否主管）
  SELECT
    e.id,
    e.workspace_id,
    e.branch_id,
    e.department_id,
    COALESCE(e.is_dept_manager, false)
  INTO v_me, v_my_workspace, v_my_branch, v_my_dept, v_is_manager
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1;

  -- 沒員工身份 / 未登入 → 全擋
  IF v_me IS NULL THEN
    RETURN FALSE;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 跨公司 cap = 全部 row 都看
  -- （cross_branch.read：跨分公司、cross_department.read：跨部門）
  -- ─────────────────────────────────────────────────────────────────────────
  IF public.has_capability_for_workspace(v_my_workspace, 'cross_branch.read')
     AND public.has_capability_for_workspace(v_my_workspace, 'cross_department.read')
  THEN
    RETURN TRUE;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: tours（旅遊團）
  --   能看：自己掛在團上 / 自己是 controller / 部門主管管同部門員工的團
  --   分公司守門：團 controller / 掛團員工 屬於我的 branch（有 branch 時）
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
          -- 我被掛在團的 role assignment 上（業務 / 團控 / 領隊 …）
          OR EXISTS (
            SELECT 1 FROM public.tour_role_assignments tra
            WHERE tra.tour_id = t.id AND tra.employee_id = v_me
          )
          -- 部門主管：管同部門員工的團
          OR (
            v_is_manager AND v_my_dept IS NOT NULL
            AND (
              -- controller 是同部門
              EXISTS (
                SELECT 1 FROM public.employees e
                WHERE e.id = t.controller_id
                  AND e.department_id = v_my_dept
                  AND public.scope_branch_match(e.branch_id, v_my_branch)
              )
              -- 或團上掛的員工有同部門人
              OR EXISTS (
                SELECT 1 FROM public.tour_role_assignments tra
                JOIN public.employees e ON e.id = tra.employee_id
                WHERE tra.tour_id = t.id
                  AND e.department_id = v_my_dept
                  AND public.scope_branch_match(e.branch_id, v_my_branch)
              )
            )
          )
          -- cross_department cap：看全公司部門（仍守 branch）
          OR (
            public.has_capability_for_workspace(v_my_workspace, 'cross_department.read')
            AND (
              -- 沒分公司的客戶（branch 全 NULL）= 自動退化看全部
              v_my_branch IS NULL
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
          )
        )
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- module: orders（訂單）
  --   能看：訂單對應的團能看（繼承 scope_visible('tours', tour_id)）
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
  --   能看：自己建立 / 對應的團能看
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
  --   能看：對應的團 / 訂單能看
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
  --   能看：自己建立 / approve / 對應的請款單能看
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
  --   能看：自己建立 / 對應的團能看
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
  -- module: order_members（團員 — 綁訂單、不綁團）
  --   能看：
  --     - 我是該訂單對應團的 controller（看全團員）
  --     - 我能看這個訂單（繼承 scope_visible('orders', order_id)）
  --   注意：「團控才看全團員」自動由「能看訂單」+「能看 controller 自己的團」cover
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
$$;

COMMENT ON FUNCTION public.scope_visible(TEXT, TEXT) IS
  'Row-level visibility 統一守門：給定 module + row_id、判斷當前 auth user 能不能看這筆。所有 RLS SELECT policy 走這個 function、不准散刻。內部依 module 分支處理 tours / orders / payment_requests / receipts / disbursement_orders / quotes / order_members。';

-- ─────────────────────────────────────────────────────────────────────────────
-- helper: scope_branch_match — branch 守門（兩端都 NULL 或相等視為 match）
--   退化處理：客戶沒用分公司 → branch 全 NULL → 永遠 match
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.scope_branch_match(
  p_row_branch UUID,
  p_my_branch UUID
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  -- 我沒分公司 → 全部 row 都 match（退化、客戶沒用分公司）
  -- row 沒分公司 → 視為「總部資料」、所有人 match
  -- 兩邊都有 → 必須相等
  SELECT
    p_my_branch IS NULL
    OR p_row_branch IS NULL
    OR p_row_branch = p_my_branch;
$$;

COMMENT ON FUNCTION public.scope_branch_match(UUID, UUID) IS
  '分公司守門 helper：退化處理客戶沒用分公司的情境（任一端 NULL 視為 match）。';

-- ─────────────────────────────────────────────────────────────────────────────
-- is_row_editable(p_module, p_row_id) → BOOLEAN
--   依各 module 既有狀態欄位判斷可否寫入（鎖 / 結案 / 已付清 等狀態擋）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_row_editable(
  p_module TEXT,
  p_row_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- orders：未付清才能改
  IF p_module = 'orders' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = p_row_id
        AND COALESCE(payment_status, 'unpaid') = 'unpaid'
    );
  END IF;

  -- payment_requests：未批准 / 未付款才能改
  IF p_module = 'payment_requests' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE id::TEXT = p_row_id
        AND status NOT IN ('approved', 'confirmed', 'billed', 'paid')
    );
  END IF;

  -- receipts：未確認 / 未退款才能改
  IF p_module = 'receipts' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.receipts
      WHERE id::TEXT = p_row_id
        AND COALESCE(status, 'draft') NOT IN ('confirmed', 'refunded')
    );
  END IF;

  -- disbursement_orders：pending 才能改
  IF p_module = 'disbursement_orders' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.disbursement_orders
      WHERE id::TEXT = p_row_id
        AND COALESCE(status, 'pending') = 'pending'
    );
  END IF;

  -- quotes：draft 才能改
  IF p_module = 'quotes' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id = p_row_id
        AND COALESCE(status, 'draft') = 'draft'
    );
  END IF;

  -- tours：暫無狀態守門（出團規則 / 結案規則之後加）
  IF p_module = 'tours' THEN
    RETURN TRUE;
  END IF;

  -- order_members：跟 orders 連動（訂單未付清才能改團員）
  IF p_module = 'order_members' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.order_members om
      JOIN public.orders o ON o.id = om.order_id
      WHERE om.id = p_row_id
        AND COALESCE(o.payment_status, 'unpaid') = 'unpaid'
    );
  END IF;

  -- 未知 module → 保守不准改
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_row_editable(TEXT, TEXT) IS
  'Row-level editability 守門：給定 module + row_id、依各 module 既有狀態欄位判斷可否寫入。RLS UPDATE = scope_visible AND is_row_editable 雙守門。';

COMMIT;
