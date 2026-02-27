drop trigger if exists trg_rebuild_on_cashflow_update on tx_cashflow;
drop trigger if exists trg_rebuild_on_debt_update on tx_debt;
drop trigger if exists trg_rebuild_on_stock_update on tx_stock;

drop function if exists rebuild_on_child_update();