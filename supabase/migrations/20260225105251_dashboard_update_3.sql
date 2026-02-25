drop view if exists dashboard_data;
CREATE OR REPLACE VIEW public.dashboard_data WITH (security_invoker='on') AS
 WITH params AS (
  SELECT
      CURRENT_DATE AS today,
      date_trunc('year', CURRENT_DATE)::date AS ytd_date,
      date_trunc('month', CURRENT_DATE)::date AS mtd_date,
      DATE '2000-01-01' AS inception_date,
      (CURRENT_DATE - INTERVAL '3 months')::date AS last3m_date,
      (CURRENT_DATE - INTERVAL '6 months')::date AS last6m_date,
      (CURRENT_DATE - INTERVAL '1 year')::date AS last1y_date
        ), pnl AS (
         SELECT public.calculate_pnl(params.ytd_date, params.today) AS pnl_ytd,
            public.calculate_pnl(params.mtd_date, params.today) AS pnl_mtd
           FROM params
        ), twr AS (
         SELECT public.calculate_twr(params.ytd_date, params.today) AS twr_ytd,
            public.calculate_twr(params.inception_date, params.today) AS twr_all
           FROM params
        ), equity_chart AS (
          select get_equity_chart(params.last3m_date, params.today, 150) as equitychart_3m,
            get_equity_chart(params.last6m_date, params.today, 150) as equitychart_6m,
            get_equity_chart(params.last1y_date, params.today, 150) as equitychart_1y,
            get_equity_chart(params.inception_date, params.today, 150) as equitychart_all
          from params
        ), return_chart AS (
          select get_return_chart(params.last3m_date, params.today, 150) as returnchart_3m,
            get_return_chart(params.last6m_date, params.today, 150) as returnchart_6m,
            get_return_chart(params.last1y_date, params.today, 150) as returnchart_1y,
            get_return_chart(params.inception_date, params.today, 150) as returnchart_all
          from params
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
            avg(((last_12.interest + last_12.tax) + last_12.fee)) AS avg_expense,
            ( SELECT jsonb_agg(jsonb_build_object('revenue', (((COALESCE(last_12.pnl, (0)::numeric) + COALESCE(last_12.fee, (0)::numeric)) + COALESCE(last_12.interest, (0)::numeric)) + COALESCE(last_12.tax, (0)::numeric)), 'fee', COALESCE(last_12.fee, (0)::numeric), 'interest', COALESCE(last_12.interest, (0)::numeric), 'tax', COALESCE(last_12.tax, (0)::numeric), 'snapshot_date', (last_12.snapshot_date)::text) ORDER BY last_12.snapshot_date) AS jsonb_agg) AS profit_chart
           FROM ( SELECT monthly_snapshots.snapshot_date,
                    monthly_snapshots.pnl,
                    monthly_snapshots.interest,
                    monthly_snapshots.tax,
                    monthly_snapshots.fee
                   FROM public.monthly_snapshots
                  ORDER BY monthly_snapshots.snapshot_date DESC
                 LIMIT 12) last_12
        )
, stock_positions AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'ticker', ticker,
            'name', name,
            'logo_url', logo_url,
            'quantity', quantity,
            'cost_basis', cost_basis,
            'price', price
        )
        ORDER BY ticker
    ) AS stock_list
    FROM public.stock_holdings
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
    monthly.profit_chart,
    stock_positions.stock_list,
    equity_chart.equitychart_3m,
    equity_chart.equitychart_6m,
    equity_chart.equitychart_1y,
    equity_chart.equitychart_all,
    return_chart.returnchart_3m,
    return_chart.returnchart_6m,
    return_chart.returnchart_1y,
    return_chart.returnchart_all
   FROM ((((pnl
     CROSS JOIN twr)
     CROSS JOIN balance)
     CROSS JOIN debt)
     CROSS JOIN monthly)
     CROSS JOIN stock_positions
     cross join equity_chart
     cross join return_chart;