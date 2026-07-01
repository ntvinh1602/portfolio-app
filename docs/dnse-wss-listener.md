# DNSE WebSocket Listener — Implementation Plan

## Overview

A standalone Deno service running on the Vietnamese VPS that maintains a
persistent WebSocket connection to `wss://ws-openapi.dnse.com.vn/v1/stream`,
receives real-time market data, and saves it to Supabase.

## Architecture

```
VPS (Vietnam)
├── wss-listener/
│   ├── main.ts              # Entry point, orchestration
│   ├── dnse-ws-client.ts    # WebSocket connect/auth/subscribe/reconnect
│   ├── dnse-signing.ts      # HMAC-SHA256 auth signature (different from REST)
│   ├── channels.ts          # Channel definitions, subscription config
│   ├── supabase-writer.ts   # Batch writes to Supabase
│   ├── config.ts            # Env vars, constants
│   └── deno.json            # Deno config
│
├── .env                     # DNSE creds + Supabase service key
└── dnse-ws-listener.service # Systemd unit
```

## WebSocket Protocol

- **Endpoint:** `wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json`
- **Auth:** Must authenticate within 30s of connection
  - `timestamp` = Unix epoch seconds
  - `nonce` = random string (UUID without dashes)
  - `message` = `"{api_key}:{timestamp}:{nonce}"`
  - `signature` = HMAC-SHA256(api_secret, message).hexdigest()
  - Send: `{ action: "auth", data: { apiKey, signature, timestamp, nonce } }`
- **Keepalive:** Server sends `ping` every 3min, client must `pong` within 60s
- **Max duration:** 8 hours — server sends `connection_expired`, client reconnects
- **Reconnection:** Exponential backoff 1s→2s→4s→8s→16s (cap 60s)
- **On reconnect:** Re-authenticate, re-subscribe to all channels

## Channels to Subscribe

| Channel | Purpose |
|---------|---------|
| `order:{accountNo}` | Order status changes (PendingNew→Filled→Canceled) |
| `position:{accountNo}` | Position updates (quantity, PnL changes) |
| `trades:{symbol}` | Trade match events for watched symbols |
| `quotes:{symbol}` | Bid/ask depth updates for watched symbols |

Symbols and account number configurable via env vars.

## Supabase Tables

### dnse_realtime_trades

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | |
| symbol | TEXT NOT NULL | |
| price | BIGINT NOT NULL | VNX price format (x1000) |
| quantity | INT NOT NULL | |
| side | TEXT NOT NULL | NB/NS |
| timestamp | TIMESTAMPTZ NOT NULL | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| UNIQUE(symbol, timestamp) | | Upsert conflict target |

### dnse_realtime_quotes

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | |
| symbol | TEXT NOT NULL | |
| bid_price | BIGINT | |
| bid_quantity | INT | |
| ask_price | BIGINT | |
| ask_quantity | INT | |
| timestamp | TIMESTAMPTZ NOT NULL | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| UNIQUE(symbol, timestamp) | | |

### dnse_order_events

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | |
| account_no | TEXT NOT NULL | |
| order_id | BIGINT NOT NULL | |
| symbol | TEXT NOT NULL | |
| side | TEXT NOT NULL | NB/NS |
| order_type | TEXT NOT NULL | LO/MOK/MAK/etc |
| price | BIGINT NOT NULL | |
| quantity | INT NOT NULL | |
| fill_quantity | INT DEFAULT 0 | |
| order_status | TEXT NOT NULL | |
| timestamp | TIMESTAMPTZ NOT NULL | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

### dnse_position_events

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | |
| account_no | TEXT NOT NULL | |
| position_id | BIGINT NOT NULL | |
| symbol | TEXT NOT NULL | |
| side | TEXT NOT NULL | NB/NS |
| quantity | INT NOT NULL | |
| average_price | NUMERIC | |
| unrealized_pnl | NUMERIC | |
| timestamp | TIMESTAMPTZ NOT NULL | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

## Environment Variables

```bash
DNSE_API_KEY=<api-key>
DNSE_API_SECRET=<api-secret>
DNSE_ACCOUNT_NO=<account-number>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
CHANNELS=order,position,trades
SYMBOLS=VN30,TCB,VHM
```

## Systemd Service

```ini
[Unit]
Description=DNSE WebSocket Listener
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/dnse-ws-listener
ExecStart=/usr/bin/deno run --allow-net --allow-env --allow-read main.ts
Restart=always
RestartSec=5
EnvironmentFile=/opt/dnse-ws-listener/.env

[Install]
WantedBy=multi-user.target
```

## Deployment Steps

1. Install Deno on VPS: `curl -fsSL https://deno.land/install.sh | sh`
2. Deploy code to `/opt/dnse-ws-listener/`
3. Create `.env` with credentials
4. Run SQL migration to create tables
5. Enable and start systemd service
6. Verify: check Supabase tables for incoming data
7. Monitor: `journalctl -u dnse-ws-listener -f`
