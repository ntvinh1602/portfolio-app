CREATE OR REPLACE FUNCTION get_asset_account_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    accounts_data jsonb;
    assets_data jsonb;
BEGIN
    -- Fetch accounts data
    SELECT jsonb_agg(accounts)
    INTO accounts_data
    FROM accounts
    WHERE user_id = p_user_id AND type != 'conceptual';

    -- Fetch assets data
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'user_id', a.user_id,
            'security_id', a.security_id,
            'securities', to_jsonb(s)
        )
    )
    INTO assets_data
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability');

    RETURN jsonb_build_object(
        'accounts', accounts_data,
        'assets', assets_data
    );
END;
$$;