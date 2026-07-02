# DNSE WSS Listener — Implementation Plan

A standalone Node.js daemon running on a 512 MB VPS that listens to the DNSE
LightSpeed market-data WebSocket, subscribes to **closed OHLC bars**
(`ohlc_closed`) for the tickers you currently hold, and upserts each bar into
Supabase. Read-only market data only — no trading, no order/position channels.

---

## 1. Context & Constraints

| Item | Value |
|---|---|
| App stack | Next.js + Supabase (app hosted on Vercel) |
| VPS | Cloud VPS, **512 MB RAM**, located in-region (VN egress) |
| VPS existing role | Runs a **Caddy** reverse/forward proxy for geoblock bypass of DNSE REST calls (already up) |
| This daemon's scope | WSS listener + Supabase writer **only** — does **not** use the Caddy REST path |
| Message volume | Low — a few stocks, 1-minute closed bars; infrequent overall |
| DNSE WS gateway | `wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json` |
| Channel | `ohlc_closed.{resolution}.{encoding}` → `ohlc_closed.1.json` |
| Symbol source | Supabase RPC (`service_role`) — **not** the DNSE positions REST endpoint |

### Key architectural decisions

1. **Dedicated persistent process**, separate from Next.js. WebSocket listening
   is long-lived and stateful; it cannot run on Vercel/serverless.
2. **Single-connection, hand-rolled Node `ws` client.** The official DNSE SDK
   ships a full-featured Python WS client (6-worker dispatch pool, etc.), but
   that machinery is overkill for this volume. We replicate only the SDK's
   *protocol* faithfully.
3. **No REST dependency in the daemon.** The ticker list comes from a Supabase
   RPC using the same `service_role` key we already need for inserts. This
   removes the DNSE HTTP-Signature signing code and the Caddy coupling from the
   listener entirely. The daemon talks to exactly two endpoints: **Supabase**
   (read tickers + write bars) and the **DNSE WS**.
4. **Idempotent upserts** keyed on `(symbol, resolution, bar_time)` so that
   reconnect-driven duplicate bars are harmless. `ohlc_closed` bars are
   immutable once emitted, so a re-received bar is byte-identical.
5. **Two layers of recovery:** unbounded in-app reconnect (exponential backoff,
   capped at 60 s) **plus** systemd `Restart=always`.

---

## 2. Protocol Reference (verified against the official SDK)

Source of truth: [dnse-tech/openapi-sdk](https://github.com/dnse-tech/openapi-sdk)
(`python/dnse/websocket/*`, `javascript/dnse/*`). The following was confirmed by
reading the SDK source — do not deviate.

### 2.1 Connection

```
wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json
```

Use `encoding=json` (not msgpack): no extra dependency, human-inspectable frames
in logs, bandwidth is irrelevant at this volume.

### 2.2 Handshake sequence

1. **Welcome** (server → client): immediately after connect the server sends a
   welcome frame containing `session_id` / `sid`. Read and discard it **before**
   authenticating.
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
   - `timestamp` = Unix epoch **seconds** (integer)
   - `nonce` = unique string (SDK uses microsecond timestamp; a UUID hex also works)
   - `signature = HMAC_SHA256_hex(api_secret, "{api_key}:{timestamp}:{nonce}")`
3. **Auth result** (server → client): success ⇒ `{"action":"auth_success"}`.
   Failure ⇒ `{"action":"auth_error"}` or `{"action":"error"}`.

> ⚠️ This differs from some doc summaries that show a nested `data:{apiKey,...}`
> payload and an `{action:"auth", code:0}` success. The SDK source is
> authoritative: **flat `api_key`, success action is `auth_success`.**

### 2.3 Subscribe

```json
{
  "action": "subscribe",
  "channels": [
    { "name": "ohlc_closed.1.json", "symbols": ["SSI", "HPG"] }
  ]
}
```

- Symbols live **inside each channel object** — there is no top-level `symbols`
  and no `data` wrapper.
- Confirmation frame: `{"action":"subscribed"}`.
- **Must be sent only after `auth_success`.**
- **Must be re-sent after every reconnect** — subscriptions do not survive a new
  socket.

Unsubscribe mirrors it:
```json
{ "action": "unsubscribe",
  "channels": [ { "name": "ohlc_closed.1.json", "symbols": ["HPG"] } ] }
```

### 2.4 Data frames — dispatch on the `T` type tag

Market-data frames carry a **type tag `T`**, not a channel-name string:

| `T` value | Meaning | Action |
|---|---|---|
| `bc` | **OHLC closed** (confirmed bar) | **Persist** |
| `b` | OHLC live (in-progress bar) | Ignore |

`ohlc_closed` payload fields (per DNSE spec):

```json
{
  "time": 1757992500,     // bar OPEN time (unix seconds) — idempotency key
  "open": 30.4,
  "high": 30.4,
  "low": 30.25,
  "close": 30.3,
  "volume": 1398200,
  "symbol": "HPG",
  "resolution": "15",
  "lastUpdated": 1757993014,  // when the bar was finalized
  "type": "STOCK"         // STOCK | DERIVATIVE | INDEX
}
```

### 2.5 Keepalive (ping / pong)

- **Client → server:** send `{"action":"ping"}` every ~25 s (SDK
  `heartbeat_interval = 25.0`).
- **Server → client:** on inbound `{"action":"ping"}`, reply `{"action":"pong"}`.
- Track `lastPongTime`; if no pong for **2 × heartbeat interval**, treat the
  connection as unhealthy → tear down → reconnect.

### 2.6 Reconnection

- Backoff: `min(2^(n-1), 60)` seconds → 1, 2, 4, 8, 16, 32, 60, 60, …
- On reconnect: re-read welcome → re-authenticate → **re-subscribe all stored
  channels** → reset pong timer.
- The SDK stops after `max_retries` (10). **For a 24/7 daemon, make reconnect
  effectively unbounded** (keep retrying at the 60 s cap). systemd
  `Restart=always` is the second safety net.

---

## 3. Supabase Design

### 3.1 Bars table

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
-- service_role bypasses RLS. Add a SELECT policy only if the anon/authed
-- client will read this table directly from the browser.
```

The primary key `(symbol, resolution, bar_time)` is what makes reconnect
duplicates harmless via upsert.

### 3.2 Active tickers RPC

The daemon fetches the ticker set through a Postgres function (RPC), which
`service_role` can call over PostgREST. This preserves the exact query
semantics of the original SQL.

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
> Since the daemon uses the `service_role` key, no extra grant is normally
> needed; if you lock down `public` EXECUTE, add
> `grant execute on function public.active_stock_tickers() to service_role;`.

Call it via:
```
POST {SUPABASE_URL}/rest/v1/rpc/active_stock_tickers
Headers: apikey, Authorization: Bearer <service_role>, Content-Type: application/json
Body:    {}
Response: [ { "ticker": "SSI" }, { "ticker": "HPG" }, ... ]
```

### 3.3 Bar upsert (PostgREST)

```
POST {SUPABASE_URL}/rest/v1/ohlc_bars
Headers:
  apikey: <service_role>
  Authorization: Bearer <service_role>
  Content-Type: application/json
  Prefer: resolution=merge-duplicates,return=minimal
Body: { <row> }
```

`Prefer: resolution=merge-duplicates` makes PostgREST upsert against the
`(symbol, resolution, bar_time)` primary key.

---

## 4. Symbol Refresh & Subscription Reconciliation

The ticker set is driven by your own `tx_legs` table (via the RPC), so it
changes the moment your app records a trade leg.

- **Cadence:** poll the RPC every `REFRESH_MS` (default 5 min). This is ample
  for 1-minute bars.
- **Reconcile, don't rebuild:** maintain an in-memory `Set` of subscribed
  symbols; on each refresh compute the diff:
  - `add    = desired − subscribed` → send `subscribe`
  - `remove = subscribed − desired` → send `unsubscribe`
- **Empty set:** subscribe to nothing (idle but connected); never crash on empty.
- **On (re)connect:** re-subscribe the *current* desired set.
- **Upgrade path (optional, later):** replace the 5-min poll with Supabase
  Realtime / `LISTEN` on `tx_legs` for zero-latency subscription changes. Not
  needed now.

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

---

## 5. Project Layout

```
dnse-listener/
├─ package.json                 # deps: ws  (crypto & fetch are built-in on Node 18+)
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

Dependencies are just `ws`. Node 18+ provides global `fetch` and the `crypto`
module, keeping the footprint ~40–60 MB.

---

## 6. Environment Variables

```
DNSE_API_KEY=...
DNSE_API_SECRET=...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OHLC_RESOLUTION=1
REFRESH_MS=300000
HEARTBEAT_MS=25000
```

Stored in `/etc/dnse-listener.env` with `chmod 600`. No DNSE account number, no
REST base URL — those are gone with the positions endpoint.

---

## 7. Module Responsibilities & Key Snippets

### 7.1 `ws.js` — connection lifecycle

State machine:

```
CONNECTING → (open) → read WELCOME → send AUTH → AUTHENTICATING
  ├─ auth_success        → SUBSCRIBING → send subscribe(currentSet) → LIVE
  ├─ auth_error/timeout  → terminate → RECONNECT(backoff++)
LIVE:
  ├─ inbound ping        → send pong
  ├─ inbound pong        → lastPongTime = now
  ├─ data frame T:"bc"   → sink.upsert(toRow(msg)); resetLiveness()
  ├─ data frame T:"b"    → ignore
  ├─ subscribed          → log
  ├─ error/close         → RECONNECT(backoff++)
  └─ no pong for 2×HB    → terminate → RECONNECT(backoff++)
outbound heartbeat: send {"action":"ping"} every HEARTBEAT_MS
```

Auth signature (built-in `crypto`, no deps):

```javascript
import crypto from "node:crypto";

function authMessage(apiKey, apiSecret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = String(Date.now() * 1000 + Math.floor(Math.random() * 1000)); // microsecond-ish
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(`${apiKey}:${timestamp}:${nonce}`)
    .digest("hex");
  return { action: "auth", api_key: apiKey, signature, timestamp, nonce };
}
```

### 7.2 `symbols.js` — active tickers via RPC

```javascript
export async function fetchActiveSymbols() {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/active_stock_tickers`,
    {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );
  if (!res.ok) throw new Error(`symbols ${res.status}: ${await res.text()}`);
  return (await res.json()).map((r) => r.ticker);
}
```

### 7.3 `sink.js` — bar upsert with bounded retry

```javascript
function toRow(msg) {
  return {
    symbol: msg.symbol,
    resolution: msg.resolution,
    bar_time: new Date(msg.time * 1000).toISOString(),
    open: msg.open, high: msg.high, low: msg.low, close: msg.close,
    volume: msg.volume,
    type: msg.type,
    last_updated: new Date(msg.lastUpdated * 1000).toISOString(),
  };
}

async function upsertBar(row, attempt = 1) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/ohlc_bars`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    if (attempt < 3) return upsertBar(row, attempt + 1); // short bounded retry
    throw new Error(`sink ${res.status}: ${await res.text()}`);
  }
}
```

**Failure policy (read-only, low value-at-risk):** retry 3× with short backoff;
if it still fails, **log and drop** — never block the WS read loop or buffer
unboundedly. Missing bars can be backfilled later via REST `GET /price/ohlc`.

### 7.4 `subscriptions.js` — reconcile

Holds the `Set<symbol>` source of truth; exposes `reconcile(desired[])` that
diffs against the current set and emits `subscribe` / `unsubscribe` frames via
`ws.js`. `ws.js` calls back into it on reconnect to replay the full set.

---

## 8. systemd Unit

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

- `--max-old-space-size=192` caps the Node heap, leaving headroom for OS + swap.
- `MemoryMax=256M` hard-limits the cgroup; combined with unbounded in-app
  reconnect this gives two recovery layers.

---

## 9. VPS Memory Hygiene (512 MB)

- Add a **1–2 GB swapfile** as OOM insurance against transient spikes.
- Log to **journald** with rotation; never let an unbounded log file fill disk.
- Expected steady-state RSS: **well under 256 MB** for a single connection and a
  handful of symbols.

---

## 10. Build & Validation Order

1. **Supabase objects** — create `ohlc_bars` table + `active_stock_tickers()` RPC.
   Verify the RPC returns the expected tickers via a manual `POST .../rpc/...`.
2. **`symbols.js`** — print the ticker list fetched via `service_role`; confirm
   it matches current holdings.
3. **`ws.js` handshake** — connect → read welcome → auth → confirm
   `auth_success` → subscribe `ohlc_closed.1.json` with **one** symbol →
   **log raw frames**. Confirm `T:"bc"` and the exact payload field names before
   wiring the DB.
4. **`sink.js` + idempotency** — enable upsert; restart the daemon mid-session;
   confirm **no duplicate rows** (PK upsert working).
5. **`subscriptions.js` reconcile** — simulate a holdings change (insert/close a
   leg); confirm add → subscribe and drop → unsubscribe within `REFRESH_MS`.
6. **Keepalive** — run > 3 min; confirm the connection survives (client ping +
   server-ping pong handling).
7. **Reconnect** — kill the socket / block egress briefly; confirm backoff
   1→2→4→8→…→60 s, re-auth, and re-subscribe of the current set.
8. **Memory** — `systemctl status` after 24 h; confirm RSS stays well under
   256 M.

**Fastest path to a working stream:** do steps 1–3 first and get raw `T:"bc"`
frames printing before touching the database — that de-risks the only remaining
unknown (exact payload field names).

---

## 11. Explicitly Out of Scope (for now)

- Trading (order placement) — would require the 8-hour trading-token flow and
  the `order` / `position` channels.
- Derivative symbols — would require mapping `symbol → symbolType`
  (e.g. `VN30F1M`); STOCK-only for now.
- Other market-data channels (`quotes`, `trades`, `foreign`, indices) — the
  design generalizes to them (same connection, add channel objects), but only
  `ohlc_closed.1` is in scope.
- Backfill/gap-fill via REST `GET /price/ohlc` — noted as the recovery mechanism
  for dropped bars, not implemented in v1.
