CREATE OR REPLACE VIEW public.dashboard_data WITH (security_invoker='on') AS
 WITH params AS (
         SELECT CURRENT_DATE AS today,
            (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date AS start_of_year,
            (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date AS start_of_month,
            '2000-01-01'::date AS start_of_all
        ), pnl AS (
         SELECT public.calculate_pnl(params.start_of_year, params.today) AS pnl_ytd,
            public.calculate_pnl(params.start_of_month, params.today) AS pnl_mtd
           FROM params
        ), twr AS (
         SELECT public.calculate_twr(params.start_of_year, params.today) AS twr_ytd,
            public.calculate_twr(params.start_of_all, params.today) AS twr_all
           FROM params
        ), balance AS (
         SELECT sum(balance_sheet.total_value) FILTER (WHERE (balance_sheet.asset_class = 'equity'::public.asset_class)) AS total_equity,
            sum(balance_sheet.total_value) FILTER (WHERE (balance_sheet.asset_class = 'liability'::public.asset_class)) AS total_liabilities,
            sum(balance_sheet.total_value) FILTER (WHERE (balance_sheet.asset_class = 'fund'::public.asset_class)) AS fund,
            sum(balance_sheet.total_value) FILTER (WHERE (balance_sheet.asset_class = 'stock'::public.asset_class)) AS stock,
            sum(balance_sheet.total_value) FILTER (WHERE (balance_sheet.asset_class = 'cash'::public.asset_class)) AS cash,
            max(balance_sheet.total_value) FILTER (WHERE (balance_sheet.ticker = 'MARGIN'::text)) AS margin
           FROM public.balance_sheet
        ), debt AS (
         SELECT sum((outstanding_debts.principal + outstanding_debts.interest)) AS debts
           FROM public.outstanding_debts
        ), monthly AS (
         SELECT sum(last_12.pnl) AS total_pnl,
            avg(last_12.pnl) AS avg_profit,
            -avg(((last_12.interest + last_12.tax) + last_12.fee)) AS avg_expense,
            ( SELECT jsonb_agg(jsonb_build_object('revenue', (((COALESCE(last_12.pnl, (0)::numeric) + COALESCE(last_12.fee, (0)::numeric)) + COALESCE(last_12.interest, (0)::numeric)) + COALESCE(last_12.tax, (0)::numeric)), 'fee', COALESCE(-last_12.fee, (0)::numeric), 'interest', COALESCE(-last_12.interest, (0)::numeric), 'tax', COALESCE(-last_12.tax, (0)::numeric), 'snapshot_date', (last_12.snapshot_date)::text) ORDER BY last_12.snapshot_date) AS jsonb_agg) AS profit_chart
           FROM ( SELECT monthly_snapshots.snapshot_date,
                    monthly_snapshots.pnl,
                    monthly_snapshots.interest,
                    monthly_snapshots.tax,
                    monthly_snapshots.fee
                   FROM public.monthly_snapshots
                  ORDER BY monthly_snapshots.snapshot_date DESC
                 LIMIT 12) last_12
        )
 SELECT pnl.pnl_ytd,
    pnl.pnl_mtd,
    twr.twr_ytd,
    twr.twr_all,
    balance.total_equity,
    balance.total_liabilities,
    balance.fund,
    balance.stock,
    balance.cash,
    balance.margin,
    debt.debts,
    monthly.total_pnl,
    monthly.avg_profit,
    monthly.avg_expense,
    monthly.profit_chart
   FROM ((((pnl
     CROSS JOIN twr)
     CROSS JOIN balance)
     CROSS JOIN debt)
     CROSS JOIN monthly);
