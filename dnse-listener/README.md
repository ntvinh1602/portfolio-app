# DNSE Listener

Standalone Node.js daemon for persisting DNSE `ohlc_closed` bars into Supabase.

## Files

- `src/index.js`: bootstrap, config validation, symbol refresh loop
- `src/ws.js`: DNSE WebSocket lifecycle, heartbeat, reconnect, replay
- `src/symbols.js`: Supabase RPC fetch for active stock tickers
- `src/subscriptions.js`: desired symbol reconciliation
- `src/sink.js`: PostgREST upsert with bounded retry and drop-on-failure policy
- `dnse-listener.service`: systemd unit for the VPS

## Environment

Copy `.env.example` to `/etc/dnse-listener.env` on the VPS and fill in:

```bash
DNSE_API_KEY=...
DNSE_API_SECRET=...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OHLC_RESOLUTION=1
REFRESH_MS=300000
HEARTBEAT_MS=25000
```

Set permissions with:

```bash
sudo chown root:root /etc/dnse-listener.env
sudo chmod 600 /etc/dnse-listener.env
```

## Deploy

1. Copy this directory to `/opt/dnse-listener`.
2. Run `npm install --omit=dev`.
3. Copy `dnse-listener.service` to `/etc/systemd/system/dnse-listener.service`.
4. Run `sudo systemctl daemon-reload`.
5. Run `sudo systemctl enable --now dnse-listener`.
6. Inspect logs with `journalctl -u dnse-listener -f`.

## Supabase Notes

- Run the migration `supabase/migrations/20260702093000_add_ohlc_listener.sql`.
- The migration explicitly grants `service_role` access to the table and RPC.
- If your cloud project uses the 2026 Data API exposure defaults, keep `public`
  exposed and do not loosen grants for `anon` or `authenticated` unless the web
  app also needs direct browser reads from `ohlc_bars`.
