-- Drop the existing function to ensure a clean update
DROP FUNCTION IF EXISTS "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date");

-- Recreate the function with diagnostic logging
CREATE OR REPLACE FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
    v_twr numeric := 1.0;
    v_hpr numeric;
    r record;
    v_bmv numeric;
    v_emv numeric;
    v_cf numeric;
    v_prev_emv numeric;
    v_last_bmv numeric; -- Track the BMV for the final period
begin
    -- Get the beginning market value from the day before the start date
    select net_equity_value::numeric into v_prev_emv
    from daily_performance_snapshots
    where user_id = p_user_id and date <= p_start_date - interval '1 day'
    order by date desc
    limit 1;

    -- If no data for the day before, use the first day's value before any cash flow
    if v_prev_emv is null then
        select (net_equity_value::numeric - net_cash_flow::numeric) into v_prev_emv
        from daily_performance_snapshots
        where user_id = p_user_id and date >= p_start_date
        order by date asc
        limit 1;
    end if;
    
    -- Initialize BMV for the first period
    v_bmv := v_prev_emv;
    v_last_bmv := v_bmv; -- Track for final period calculation
    RAISE LOG 'calculate_twr LOG: Initial BMV (v_prev_emv): %', v_bmv;

    for r in
        select
            date,
            net_equity_value::numeric as net_equity_value,
            net_cash_flow::numeric as net_cash_flow
        from daily_performance_snapshots
        where user_id = p_user_id
          and date between p_start_date and p_end_date
        order by date
    loop
        -- If there is a cash flow, calculate the HPR for the sub-period ending today
        if r.net_cash_flow != 0 then
            -- EMV for the sub-period is the equity value *before* the cash flow
            v_emv := r.net_equity_value - r.net_cash_flow;
            
            RAISE LOG 'calculate_twr LOG: Cash flow on %: CF=%, Equity=%', r.date, r.net_cash_flow, r.net_equity_value;
            RAISE LOG 'calculate_twr LOG:   Sub-period: BMV=% , EMV=%', v_bmv, v_emv;

            -- Calculate HPR for this sub-period
            if v_bmv != 0 then
                v_hpr := (v_emv - v_bmv) / v_bmv;
                v_twr := v_twr * (1 + v_hpr);
                RAISE LOG 'calculate_twr LOG:   HPR=% , Cumulative TWR=%', v_hpr, v_twr;
            end if;
            
            -- The new BMV for the next sub-period is the equity value *after* the cash flow
            v_bmv := r.net_equity_value;
            v_last_bmv := v_bmv; -- Update tracking variable
            RAISE LOG 'calculate_twr LOG:   New BMV for next period: %', v_bmv;
        else
            -- No cash flow on this day, just update the last BMV for final calculation
            v_last_bmv := v_bmv;
        end if;
    end loop;

    -- Final period calculation: from the last cash flow date to the end date
    -- Use the final day's equity value as the ending market value
    select net_equity_value::numeric into v_emv
    from daily_performance_snapshots
    where user_id = p_user_id and date <= p_end_date
    order by date desc
    limit 1;

    RAISE LOG 'calculate_twr LOG: Final Period Calculation:';
    RAISE LOG 'calculate_twr LOG:   Last BMV=% , Final EMV=%', v_last_bmv, v_emv;

    -- Calculate the final period return
    if v_last_bmv != 0 and v_emv is not null then
        v_hpr := (v_emv - v_last_bmv) / v_last_bmv;
        v_twr := v_twr * (1 + v_hpr);
        RAISE LOG 'calculate_twr LOG:   Final HPR=% , Final TWR=%', v_hpr, v_twr;
    end if;

    -- Return the time-weighted return as a percentage (subtract 1 to get the return rate)
    return (v_twr - 1);
end;
$$;