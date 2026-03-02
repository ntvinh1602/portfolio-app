CREATE OR REPLACE VIEW public.monthly_snapshots WITH (security_invoker='on') AS
 WITH month_ranges AS (
         SELECT (date_trunc('month'::text, d.d))::date AS month_start,
            LEAST(((date_trunc('month'::text, d.d) + '1 mon -1 days'::interval))::date, CURRENT_DATE) AS month_end
           FROM generate_series('2021-11-01 00:00:00+00'::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 mon'::interval) d(d)
        ), monthly_transactions AS (
         SELECT (date_trunc('month'::text, t.created_at))::date AS month,
            COALESCE(sum(s.fee), 0) + COALESCE(sum(cf.net_proceed) FILTER (WHERE (t.memo ~~* '%fee%'::text)), 0) AS total_fees,
            COALESCE(sum(s.tax), 0) AS total_taxes,
            COALESCE(sum(d.interest), 0) AS loan_interest,
            COALESCE(sum(cf.net_proceed) FILTER (WHERE (t.memo ~~* '%interest%'::text)), 0) AS margin_interest
           FROM (((public.tx_entries t
             LEFT JOIN public.tx_debt d ON ((d.tx_id = t.id)))
             LEFT JOIN public.tx_stock s ON ((s.tx_id = t.id)))
             LEFT JOIN public.tx_cashflow cf ON ((cf.tx_id = t.id)))
          GROUP BY ((date_trunc('month'::text, t.created_at))::date)
        ), monthly_pnl AS (
         SELECT m_1.month_start,
            m_1.month_end,
            start_s.net_equity AS start_equity,
            end_s.net_equity AS end_equity,
            COALESCE(sum(ds.net_cashflow), (0)::numeric) AS cash_flow,
            ((COALESCE(end_s.net_equity, (0)::numeric) - COALESCE(start_s.net_equity, (0)::numeric)) - COALESCE(sum(ds.net_cashflow), (0)::numeric)) AS pnl
           FROM (((month_ranges m_1
             LEFT JOIN public.daily_snapshots ds ON (((ds.snapshot_date >= m_1.month_start) AND (ds.snapshot_date <= m_1.month_end))))
             LEFT JOIN LATERAL ( SELECT s.net_equity
                   FROM public.daily_snapshots s
                  WHERE (s.snapshot_date < m_1.month_start)
                  ORDER BY s.snapshot_date DESC
                 LIMIT 1) start_s ON (true))
             LEFT JOIN LATERAL ( SELECT s.net_equity
                   FROM public.daily_snapshots s
                  WHERE (s.snapshot_date <= m_1.month_end)
                  ORDER BY s.snapshot_date DESC
                 LIMIT 1) end_s ON (true))
          GROUP BY m_1.month_start, m_1.month_end, start_s.net_equity, end_s.net_equity
        )
 SELECT m.month_start AS snapshot_date,
    mp.pnl,
    (COALESCE(mt.loan_interest, (0)::numeric) + COALESCE(mt.margin_interest, (0)::numeric)) AS interest,
    COALESCE(mt.total_taxes, (0)::numeric) AS tax,
    COALESCE(mt.total_fees, (0)::numeric) AS fee
   FROM ((month_ranges m
     LEFT JOIN monthly_pnl mp ON ((mp.month_start = m.month_start)))
     LEFT JOIN monthly_transactions mt ON ((mt.month = m.month_start)))
  ORDER BY m.month_start DESC;