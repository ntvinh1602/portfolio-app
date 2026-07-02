# DNSE WSS Listener Architecture

## Overview

A standalone Node.js daemon running on a 512 MB VPS that listens to the DNSE
LightSpeed market-data WebSocket, subscribes to **closed OHLC bars**
(`ohlc_closed`) for the tickers you currently hold, and upserts each bar into
Supabase. Read-only market data only — no trading, no order/position channels.

```
DNSE WS Gateway  ──WSS──►  VPS Node Daemon  ──HTTPS──►  Supabase
wss://ws-openapi...         (512 MB RAM)                 (REST API)
                            port: N/A (outbound only)
```

## Components

### Node.js Daemon

**Purpose:** Listen to DNSE WebSocket, subscribe to OHLC closed bars for active holdings, upsert bars to Supabase.

**Location:** `/opt/dnse-listener/`

```
dnse-listener/
├─ package.json                 # deps: ws (crypto & fetch built-in on Node 18+)
├─ .env                         # not committed; loaded via systemd EnvironmentFile
├─ src/
│  ├─ index.js                  # bootstrap, config, wiring, refresh loop
│  ├─ ws.js                     # WS lifecycle: connect → welcome → auth → subscribe,
│  │                            #   ping/pong, health check, unbounded reconnect
│  ├─ symbols.js                # POST rpc/active_stock_tickers via service_role
│  ├─ subscriptions.js          # desired/subscribed reconcile logic
│  ├─ sink.js                   # PostgREST upsert (merge-duplicates) + bounded retry
│  └─ log.js                    # minimal structured logging → journald
└─ dnse-listener.service        # systemd unit
```

**Key architectural decisions:**
- **Dedicated persistent process** — WebSocket listening is long-lived and stateful; cannot run on Vercel/serverless
- **Single-connection, hand-rolled Node `ws` client** — official DNSE SDK ships a full Python WS client (6-worker dispatch pool), overkill for this volume
- **No REST dependency in the daemon** — ticker list comes from Supabase RPC, removing DNSE HTTP-Signature signing and Caddy coupling
- **Idempotent upserts** keyed on `(symbol, resolution, bar_time)` — reconnect-driven duplicates are harmless since `ohlc_closed` bars are immutable
- **Two layers of recovery:** unbounded in-app reconnect (exponential backoff, capped at 60 s) **plus** systemd `Restart=always`

### systemd Unit

**Service file:** `/etc/systemd/system/dnse-listener.service`

```ini
[Unit]
Description=DNSE WSS OHLC Listener
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/dnse-listener.env
ExecStart=/usr/bin/node --max-old-space-size=192 /opt/dnse-listener/src/index.js
Restart=always
RestartSec=2
MemoryMax=256M
StandardOutput=journal
StandardError=journal
SyslogIdentifier=dnse-listener

[Install]
WantedBy=multi-user.target
```

**Service management:**
```bash
systemctl status dnse-listener
systemctl restart dnse-listener
journalctl -u dnse-listener -f          # live logs
```

**Memory notes:**
- `--max-old-space-size=192` caps the Node heap, leaving headroom for OS + swap
- `MemoryMax=256M` hard-limits the cgroup
- Expected steady-state RSS: **well under 256 MB** for a single connection and a handful of symbols

### VPS Memory Hygiene (512 MB)

- Swapfile: **1–2 GB** as OOM insurance against transient spikes
- Logs to **journald** with rotation; never let an unbounded log file fill disk

### Supabase Objects

**Bars table** (`public.ohlc_bars`):

```sql
create table if not exists public.ohlc_bars (
  symbol        text        not null,
  resolution    text        not null,
  bar_time      timestamptz not null,          -- = payload.time (bar open)
  open          numeric     not null,
  high          numeric     not null,
  low           numeric     not null,
  close         numeric     not null,
  volume        bigint      not null,
  type          text,                            -- STOCK / DERIVATIVE / INDEX
  last_updated  timestamptz,                     -- = payload.lastUpdated
  received_at   timestamptz not null default now(),
  primary key (symbol, resolution, bar_time)
);

alter table public.ohlc_bars enable row level security;
```

**Active tickers RPC** (`public.active_stock_tickers()`):

```sql
create or replace function public.active_stock_tickers()
returns table (ticker text)
language sql
stable
as $$
  select a.ticker
  from tx_legs l
  join assets a on l.asset_id = a.id
  where a.asset_class = 'stock'
  group by a.ticker
  having sum(l.quantity) > 0;
$$;
```

> **Security note:** keep this function callable only by `service_role`.

## Client Configuration

### Environment Variables

Stored in `/etc/dnse-listener.env` with `chmod 600`.

```
DNSE_API_KEY=<api-key>
DNSE_API_SECRET=<api-secret>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OHLC_RESOLUTION=1
REFRESH_MS=300000
HEARTBEAT_MS=25000
```

No DNSE account number or REST base URL — those are gone with the positions endpoint.

## Protocol Reference

Source of truth: [dnse-tech/openapi-sdk](https://github.com/dnse-tech/openapi-sdk). The following was confirmed by reading the SDK source.

### Connection

```
wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json
```

Uses `encoding=json` — no extra dependency, human-inspectable frames in logs.

### Handshake Sequence

1. **Welcome** (server → client): immediately after connect, contains `session_id` / `sid`. Read and discard before authenticating.
2. **Auth** (client → server) — flat object, snake_case, no `data` wrapper:
   ```json
   {
     "action": "auth",
     "api_key": "<API_KEY>",
     "signature": "<hmac_sha256_hex>",
     "timestamp": 1782964873,
     "nonce": "1782964873123456"
   }
   ```
   - `timestamp` = Unix epoch seconds (integer)
   - `nonce` = unique string (SDK uses microsecond timestamp; UUID hex also works)
   - `signature = HMAC_SHA256_hex(api_secret, "{api_key}:{timestamp}:{nonce}")`
3. **Auth result** (server → client): success ⇒ `{"action":"auth_success"}`. Failure ⇒ `{"action":"auth_error"}` or `{"action":"error"}`.

> ⚠️ This differs from some doc summaries that show a nested `data:{apiKey,...}` payload. The SDK source is authoritative: **flat `api_key`, success action is `auth_success`.**

### Subscribe

```json
{
  "action": "subscribe",
  "channels": [
    { "name": "ohlc_closed.1.json", "symbols": ["SSI", "HPG"] }
  ]
}
```

- Symbols live **inside each channel object** — no top-level `symbols` and no `data` wrapper.
- Confirmation frame: `{"action":"subscribed"}`
- **Must be sent only after `auth_success`.**
- **Must be re-sent after every reconnect** — subscriptions do not survive a new socket.

### Data Frames — dispatch on `T` type tag

| `T` value | Meaning | Action |
|---|---|---|
| `bc` | **OHLC closed** (confirmed bar) | **Persist** |
| `b` | OHLC live (in-progress bar) | Ignore |

`ohlc_closed` payload fields:

```json
{
  "time": 1757992500,
  "open": 30.4,
  "high": 30.4,
  "low": 30.25,
  "close": 30.3,
  "volume": 1398200,
  "symbol": "HPG",
  "resolution": "15",
  "lastUpdated": 1757993014,
  "type": "STOCK"
}
```

### Keepalive (ping / pong)

- **Client → server:** send `{"action":"ping"}` every ~25 s (`heartbeat_interval = 25.0`)
- **Server → client:** on inbound `{"action":"ping"}`, reply `{"action":"pong"}`
- Track `lastPongTime`; if no pong for **2 × heartbeat interval**, tear down and reconnect

### Reconnection

- Backoff: `min(2^(n-1), 60)` seconds → 1, 2, 4, 8, 16, 32, 60, 60, …
- On reconnect: re-read welcome → re-authenticate → **re-subscribe all stored channels** → reset pong timer
- Reconnect is **unbounded** (keeps retrying at 60 s cap); systemd `Restart=always` is the second safety net

## Symbol Refresh & Subscription Reconciliation

Ticker set is driven by `tx_legs` table (via RPC), changing when a trade leg is recorded.

- **Cadence:** poll the RPC every `REFRESH_MS` (default 5 min)
- **Reconcile, don't rebuild:** maintain an in-memory `Set` of subscribed symbols; on each refresh compute the diff:
  - `add    = desired − subscribed` → send `subscribe`
  - `remove = subscribed − desired` → send `unsubscribe`
- **Empty set:** subscribe to nothing (idle but connected); never crash on empty
- **On (re)connect:** re-subscribe the *current* desired set

```
subscribed : Set<symbol>
every REFRESH_MS:
  desired = rpc.active_stock_tickers()
  add    = desired − subscribed  → ws.subscribe(add)
  remove = subscribed − desired  → ws.unsubscribe(remove)
  subscribed = desired
on ws (re)connect after auth_success:
  ws.subscribe(subscribed)     // replay current set
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Daemon not running | systemd crash loop | `journalctl -u dnse-listener -n 50` — check logs for auth or network errors |
| `auth_error` | Invalid API key/secret | Verify `DNSE_API_KEY` / `DNSE_API_SECRET` in `/etc/dnse-listener.env` |
| No bars appearing | Subscription mismatch | Check `active_stock_tickers()` RPC returns expected tickers |
| Bars stalling after 2×HB | No pong received | Daemon tears down and reconnects automatically; check network egress from VPS |
| High memory usage | Log accumulation or leak | `systemctl status dnse-listener` — RSS should be < 256 MB; restart if needed |
| OOM kill | Transient spike exceeded cgroup limit | Ensure 1–2 GB swapfile is configured; check `dmesg` for OOM events |
| `NETWORK_ERROR` to Supabase | VPS can't reach Supabase | `curl $SUPABASE_URL/rest/v1/` from VPS to verify connectivity |

## Security Notes

- DNSE API key/secret stored in `/etc/dnse-listener.env` with `chmod 600`
- `service_role` key used for Supabase RPC and upserts — never exposed to client
- `X-Proxy-Key` is not involved in this daemon (WSS only, no REST proxy)
- No TLS termination needed — WSS is encrypted end-to-end; Supabase REST is HTTPS
- If credentials are compromised: rotate DNSE API key, regenerate Supabase service_role key, restart daemon

## Explicitly Out of Scope

- Trading (order placement) — requires the 8-hour trading-token flow and `order` / `position` channels
- Derivative symbols — requires mapping `symbol → symbolType` (e.g. `VN30F1M`); STOCK-only for now
- Other market-data channels (`quotes`, `trades`, `foreign`, indices) — design generalizes to them (same connection, add channel objects), but only `ohlc_closed.1` is in scope
- Backfill/gap-fill via REST `GET /price/ohlc` — noted as recovery mechanism for dropped bars, not implemented in v1
