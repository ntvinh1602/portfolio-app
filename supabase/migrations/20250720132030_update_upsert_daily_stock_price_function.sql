CREATE OR REPLACE FUNCTION upsert_daily_stock_price(p_ticker TEXT, p_price NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Get the security_id from the securities table for stock assets
  SELECT id INTO v_security_id FROM securities WHERE ticker = p_ticker AND asset_class = 'stock';

  -- If the security exists, insert or update the price
  IF v_security_id IS NOT NULL THEN
    INSERT INTO daily_stock_prices (security_id, price, date)
    VALUES (v_security_id, p_price, CURRENT_DATE)
    ON CONFLICT (security_id, date) 
    DO UPDATE SET price = p_price;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;