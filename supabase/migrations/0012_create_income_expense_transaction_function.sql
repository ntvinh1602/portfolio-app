create or replace function handle_income_expense_transaction(
    p_user_id uuid,
    p_transaction_date date,
    p_account_id uuid,
    p_amount numeric,
    p_description text,
    p_transaction_type public.transaction_type
)
returns void
language plpgsql
security definer
as $$
declare
    v_retained_earnings_asset_id uuid;
    v_cash_asset_id uuid;
    v_transaction_id uuid;
    v_cash_asset_currency_code text;
    v_retained_earnings_currency_code text;
begin
    -- Get the 'Retained Earnings' asset for the user
    select id, currency_code into v_retained_earnings_asset_id, v_retained_earnings_currency_code
    from assets
    where user_id = p_user_id and ticker = 'EARNINGS'
    limit 1;

    if v_retained_earnings_asset_id is null then
        raise exception 'Retained Earnings asset not found for user %', p_user_id;
    end if;

    -- Get the cash asset associated with the account
    select assets.id, assets.currency_code into v_cash_asset_id, v_cash_asset_currency_code
    from accounts
    join assets on assets.id = accounts.asset_id
    where accounts.id = p_account_id and accounts.user_id = p_user_id
    limit 1;

    if v_cash_asset_id is null then
        raise exception 'Cash asset not found for account %', p_account_id;
    end if;

    -- Create the transaction
    insert into transactions (user_id, transaction_date, type, description)
    values (p_user_id, p_transaction_date, p_transaction_type, p_description)
    returning id into v_transaction_id;

    -- Create the transaction legs based on the transaction type
    if p_transaction_type = 'income' then
        -- Income: Debit cash, Credit Retained Earnings
        insert into transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        values
            (v_transaction_id, p_account_id, v_cash_asset_id, p_amount, p_amount, v_cash_asset_currency_code),
            (v_transaction_id, (select id from accounts where name = 'Equity' and user_id = p_user_id and type = 'conceptual' limit 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
    elsif p_transaction_type = 'expense' then
        -- Expense: Credit cash, Debit Retained Earnings
        insert into transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        values
            (v_transaction_id, p_account_id, v_cash_asset_id, p_amount * -1, p_amount * -1, v_cash_asset_currency_code),
            (v_transaction_id, (select id from accounts where name = 'Equity' and user_id = p_user_id and type = 'conceptual' limit 1), v_retained_earnings_asset_id, p_amount, p_amount, v_retained_earnings_currency_code);
    else
        raise exception 'Invalid transaction type: %', p_transaction_type;
    end if;
end;
$$;