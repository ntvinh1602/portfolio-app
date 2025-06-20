create or replace function handle_borrow_transaction(
    p_user_id uuid,
    p_lender_name text,
    p_principal_amount numeric,
    p_interest_rate numeric,
    p_transaction_date date,
    p_deposit_account_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
    v_loans_payable_asset_id uuid;
    v_cash_asset_id uuid;
    v_transaction_id uuid;
    v_cash_asset_currency_code text;
    v_debt_id uuid;
    v_loans_payable_account_id uuid;
begin
    -- Get the 'Loans Payable' asset for the user, or create it if it doesn't exist
    select id into v_loans_payable_asset_id
    from assets
    where user_id = p_user_id and asset_classes = 'liability' and name = 'Loans Payable'
    limit 1;

    if v_loans_payable_asset_id is null then
        insert into assets (user_id, name, ticker, asset_classes, currency_code)
        values (p_user_id, 'Loans Payable', 'LOANS_PAYABLE', 'liability', 'USD') -- Assuming USD for now
        returning id into v_loans_payable_asset_id;
    end if;

    -- Get the conceptual 'Liability' account
    select id into v_loans_payable_account_id
    from accounts
    where user_id = p_user_id and name = 'Liability' and type = 'conceptual'
    limit 1;

    if v_loans_payable_account_id is null then
        raise exception 'Liability account not found for user %', p_user_id;
    end if;

    -- Get the cash asset associated with the deposit account
    select assets.id, assets.currency_code into v_cash_asset_id, v_cash_asset_currency_code
    from accounts
    join assets on assets.id = accounts.asset_id
    where accounts.id = p_deposit_account_id and accounts.user_id = p_user_id
    limit 1;

    if v_cash_asset_id is null then
        raise exception 'Cash asset not found for account %', p_deposit_account_id;
    end if;

    -- Create the debt record
    insert into debts (user_id, lender, principal, interest_rate, start_date)
    values (p_user_id, p_lender_name, p_principal_amount, p_interest_rate, p_transaction_date)
    returning id into v_debt_id;

    -- Create the transaction
    insert into transactions (user_id, transaction_date, type, description)
    values (p_user_id, p_transaction_date, 'borrow', 'Loan from ' || p_lender_name)
    returning id into v_transaction_id;

    -- Create the transaction legs
    -- 1. Debit the deposit account (increase cash)
    insert into transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    values (v_transaction_id, p_deposit_account_id, v_cash_asset_id, p_principal_amount, p_principal_amount, v_cash_asset_currency_code);

    -- 2. Credit the Loans Payable liability account (increase liability)
    insert into transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    values (v_transaction_id, v_loans_payable_account_id, v_loans_payable_asset_id, p_principal_amount * -1, p_principal_amount * -1, 'USD'); -- Assuming USD

end;
$$;