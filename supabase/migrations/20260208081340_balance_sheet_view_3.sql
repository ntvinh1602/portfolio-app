CREATE OR REPLACE VIEW public.balance_sheet WITH ("security_invoker"='on') AS
WITH
  asset_cb AS (
    SELECT a.asset_class, SUM(tl.amount) AS total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    WHERE a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ),
  asset_mv AS (
    SELECT
      a.asset_class,
      SUM(
        a.current_quantity * COALESCE(sp.price, 1) * COALESCE(er.rate, 1)
      ) AS total
    FROM assets a
    LEFT JOIN LATERAL (
      SELECT price
      FROM daily_security_prices
      WHERE asset_id = a.id
      ORDER BY date DESC
      LIMIT 1
    ) sp ON TRUE
    LEFT JOIN LATERAL (
      SELECT rate
      FROM daily_exchange_rates
      WHERE currency_code = a.currency_code
      ORDER BY date DESC
      LIMIT 1
    ) er ON TRUE
    WHERE a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ),
  totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN amv.asset_class = 'cash' THEN amv.total END), 0) AS cash_mv_raw,
      COALESCE(SUM(CASE WHEN amv.asset_class = 'stock' THEN amv.total END), 0) AS stock_mv,
      COALESCE(SUM(CASE WHEN amv.asset_class = 'fund' THEN amv.total END), 0) AS fund_mv,
      COALESCE(SUM(CASE WHEN amv.asset_class = 'crypto' THEN amv.total END), 0) AS crypto_mv,
      COALESCE(SUM(CASE WHEN acb.asset_class = 'cash' THEN acb.total END), 0) AS cash_cb,
      COALESCE(SUM(CASE WHEN acb.asset_class = 'stock' THEN acb.total END), 0) AS stock_cb,
      COALESCE(SUM(CASE WHEN acb.asset_class = 'fund' THEN acb.total END), 0) AS fund_cb,
      COALESCE(SUM(CASE WHEN acb.asset_class = 'crypto' THEN acb.total END), 0) AS crypto_cb
    FROM asset_mv amv
    FULL JOIN asset_cb acb ON amv.asset_class = acb.asset_class
  ),
  -- Cash displayed in asset side is floored at 0, but unrealized PL uses raw cash
  assets_fixed AS (
    SELECT
      GREATEST(totals.cash_mv_raw, 0) AS cash_mv,
      totals.stock_mv,
      totals.fund_mv,
      totals.crypto_mv,
      totals.cash_cb,
      totals.stock_cb,
      totals.fund_cb,
      totals.crypto_cb,
      totals.cash_mv_raw -- keep raw cash for equity calc
    FROM totals
  ),
  liabilities AS (
    SELECT
      0 - LEAST((SELECT cash_mv_raw FROM totals), 0) AS margin,
      (SELECT a.current_quantity * -1 FROM assets a WHERE a.ticker = 'DEBTS') AS debts_principal,
      COALESCE(
        SUM(
          d.principal_amount * (
            POWER(1 + d.interest_rate / 100 / 365, (CURRENT_DATE - tb.transaction_date)) - 1
          )
        ),
        0
      ) AS accrued_interest
    FROM debts d
    JOIN transactions tb ON tb.id = d.borrow_txn_id
    LEFT JOIN transactions tr ON tr.id = d.repay_txn_id
    WHERE tr.id IS NULL OR tr.transaction_date > CURRENT_DATE
  ),
  equity AS (
    SELECT
      (SELECT a.current_quantity * -1 FROM assets a WHERE a.ticker = 'CAPITAL') AS owner_capital,
      (
        (
          SELECT
            -- use *raw* cash for unrealized P/L
            totals.cash_mv_raw + totals.stock_mv + totals.fund_mv + totals.crypto_mv
          FROM totals
        ) - (
          SELECT
            totals.cash_cb + totals.stock_cb + totals.fund_cb + totals.crypto_cb
          FROM totals
        ) - (
          SELECT liabilities.accrued_interest FROM liabilities
        )
      ) AS unrealized_pl
  )
SELECT 'Cash' AS account, 'asset' AS type, (SELECT cash_mv FROM assets_fixed) AS amount
UNION ALL
SELECT 'Stock', 'asset', (SELECT stock_mv FROM assets_fixed)
UNION ALL
SELECT 'Fund', 'asset', (SELECT fund_mv FROM assets_fixed)
UNION ALL
SELECT 'Crypto', 'asset', (SELECT crypto_mv FROM assets_fixed)
UNION ALL
SELECT 'Margin', 'liability', (SELECT margin FROM liabilities)
UNION ALL
SELECT 'Debts Principal', 'liability', (SELECT debts_principal FROM liabilities)
UNION ALL
SELECT 'Accrued Interest', 'liability', (SELECT accrued_interest FROM liabilities)
UNION ALL
SELECT 'Owner Capital', 'equity', (SELECT owner_capital FROM equity)
UNION ALL
SELECT 'Unrealized P/L', 'equity', (SELECT unrealized_pl FROM equity);
