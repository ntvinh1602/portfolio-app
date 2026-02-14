drop view if exists public.outstanding_debts;

CREATE OR REPLACE VIEW public.outstanding_debts WITH (security_invoker='on') AS
 WITH borrow_tx AS (
         SELECT 
            d.tx_id,
            d.lender,
            d.principal,
            d.rate,
            e.created_at AS borrow_date
           FROM (public.tx_debt d
             JOIN public.tx_entries e ON ((e.id = d.tx_id)))
          WHERE ((d.operation = 'borrow'::text) AND (NOT (d.tx_id IN ( SELECT DISTINCT tx_debt.repay_tx
                   FROM public.tx_debt
                  WHERE (tx_debt.repay_tx IS NOT NULL)))))
        )
 SELECT
    tx_id,
    lender,
    principal,
    rate,
    borrow_date,
    EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - borrow_date)) AS duration,
    round(((principal * power(((1)::numeric + ((rate / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - borrow_date)))) - principal), 2) AS interest
   FROM borrow_tx b
  ORDER BY borrow_date;