-- MIGRATION: Create an RPC function for atomic transaction creation.
-- Uses CREATE OR REPLACE to be idempotent (no need for DROP first).

CREATE OR REPLACE FUNCTION public.create_atomic_transaction(
    p_account_id uuid,
    p_amount numeric,
    p_transaction_type text,
    p_description text,
    p_category_id uuid,
    p_transaction_date timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_balance_change numeric;
BEGIN
    INSERT INTO public.accounting_transactions(account_id, user_id, amount, type, description, category_id, transaction_date)
    VALUES (p_account_id, v_user_id, p_amount, p_transaction_type, p_description, p_category_id, p_transaction_date);

    IF p_transaction_type = 'expense' THEN
        v_balance_change := -p_amount;
    ELSIF p_transaction_type = 'income' THEN
        v_balance_change := p_amount;
    ELSE
        v_balance_change := 0;
    END IF;

    UPDATE public.accounting_accounts
    SET
        balance = balance + v_balance_change,
        updated_at = now()
    WHERE id = p_account_id AND user_id = v_user_id;
END;
$$;
