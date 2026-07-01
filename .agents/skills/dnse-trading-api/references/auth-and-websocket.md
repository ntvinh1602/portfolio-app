# DNSE Auth & WebSocket — Full Reference

## 1. REST API Signature Generation

All REST requests require `X-API-Key`, `X-Aux-Date`, and `X-Signature` headers.

### Signature Algorithm (HMAC-SHA256)

```
message  = "{http_method}\n{path}\n{query_string}\n{x_aux_date}"
signature = HMAC-SHA256(api_secret, message).hexdigest()
X-Signature = signature
```

**Field definitions:**
- `http_method` — uppercase: `GET`, `POST`, `PUT`, `DELETE`
- `path` — URL path only, e.g. `/accounts/0001179019/balances`
- `query_string` — URL-encoded query parameters sorted alphabetically by key, e.g. `marketType=STOCK&symbol=TCB`; empty string `""` if no query params
- `x_aux_date` — same value sent in the `X-Aux-Date` header, RFC 7231 format: `Mon, 19 Jan 2026 07:45:23 +0000`

### Python Example

```python
import hashlib
import hmac
from datetime import datetime, timezone
from email.utils import formatdate

def build_headers(api_key: str, api_secret: str, method: str, path: str, query: str = "") -> dict:
    date = formatdate(usegmt=True)
    message = f"{method}\n{path}\n{query}\n{date}"
    signature = hmac.new(
        api_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return {
        "X-API-Key": api_key,
        "X-Aux-Date": date,
        "X-Signature": signature,
    }
```

### JavaScript Example

```javascript
const crypto = require("crypto");

function buildHeaders(apiKey, apiSecret, method, path, query = "") {
  const date = new Date().toUTCString();
  const message = `${method}\n${path}\n${query}\n${date}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(message)
    .digest("hex");
  return {
    "X-API-Key": apiKey,
    "X-Aux-Date": date,
    "X-Signature": signature,
  };
}
```

### Notes
- `X-Aux-Date` must be within ±5 minutes of server time to avoid `401 timestamp_out_of_range`.
- For endpoints that use a request body (POST/PUT), the body is NOT included in the signature message.
- The `trading-token` header is separate from the signature — it is the token obtained from `POST /registration/trading-token`.

---

## 2. Trading Token Flow

Required before any order-placement endpoint.

### Step 1 — Trigger OTP (Email only)
```
POST /registration/send-email-otp
Headers: X-API-Key, X-Aux-Date, X-Signature
```
No body. Sends a 6-digit OTP to the registered email.

### Step 2 — Exchange OTP for Trading Token
```
POST /registration/trading-token
Headers: X-API-Key, X-Aux-Date, X-Signature
Body:
{
  "otpType": "email_otp",   // or "smart_otp" for Smart OTP app
  "passcode": "519752"
}
Response: { "tradingToken": "<token>" }
```

- Token is valid for **8 hours**.
- Pass as header `trading-token: <token>` on all order endpoints.
- Smart OTP: generate passcode from the DNSE Smart OTP app; no Step 1 needed.

---

## 3. WebSocket Protocol

### 3.1 Connection

```
wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json
```

Encoding options: `json` (default) | `msgpack`

### 3.2 WebSocket Authentication

Must authenticate **within 30 seconds** of connection or the server closes the socket.

**Signature construction:**
```
timestamp = Unix epoch seconds (integer)
nonce     = random string (e.g. UUID without dashes, 16+ chars)
message   = "{api_key}:{timestamp}:{nonce}"
signature = HMAC-SHA256(api_secret, message).hexdigest()
```

**Auth request payload:**
```json
{
  "action": "auth",
  "data": {
    "apiKey": "<api_key>",
    "signature": "<signature>",
    "timestamp": 1737274800,
    "nonce": "a1b2c3d4e5f6a1b2"
  }
}
```

**Success response:**
```json
{ "action": "auth", "code": 0, "message": "success" }
```

### 3.3 Python WebSocket Auth Example

```python
import hashlib, hmac, time, uuid, json, websocket

def ws_auth(api_key: str, api_secret: str) -> dict:
    ts = int(time.time())
    nonce = uuid.uuid4().hex
    message = f"{api_key}:{ts}:{nonce}"
    sig = hmac.new(api_secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return {
        "action": "auth",
        "data": {
            "apiKey": api_key,
            "signature": sig,
            "timestamp": ts,
            "nonce": nonce,
        },
    }

ws = websocket.WebSocketApp("wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json")
# On open, send: ws.send(json.dumps(ws_auth(API_KEY, API_SECRET)))
```

### 3.4 Subscribe / Unsubscribe

```json
// Subscribe
{
  "action": "subscribe",
  "data": { "channels": ["ohlc:VN30F1M:1"] }
}

// Unsubscribe
{
  "action": "unsubscribe",
  "data": { "channels": ["ohlc:VN30F1M:1"] }
}
```

### 3.5 Available Channels

| Channel pattern | Description |
|---|---|
| `ohlc:{symbol}:{resolution}` | OHLC candlestick updates (live bar) |
| `ohlc_closed:{symbol}:{resolution}` | Closed (confirmed) OHLC bar |
| `quotes:{symbol}` | Bid/ask order book depth updates |
| `trades:{symbol}` | Trade match events |
| `foreign:{symbol}` | Foreign investor trade events |
| `order:{accountNo}` | Order status change events (requires auth) |
| `position:{accountNo}` | Position update events (requires auth) |
| `estimate_vn30` | Estimated VN30 index value |
| `broker_order:{accountNo}` | Broker-managed account order events |
| `broker_position:{accountNo}` | Broker-managed account position events |
| `session:{tscProdGrpId}` | Trading session state events |

**resolution** values: `1`, `3`, `5`, `15`, `30`, `1h`, `1D`, `1W`

### 3.6 PING / PONG Keepalive

- Server sends a PING every **3 minutes** (application-level message, not WebSocket protocol ping).
- Client **must** respond with PONG within **60 seconds** or the connection is closed.

```json
// Server → Client (PING)
{ "action": "ping" }

// Client → Server (PONG)
{ "action": "pong" }
```

### 3.7 Connection Limits & Reconnection

- Maximum connection duration: **8 hours**. Server sends `connection_expired` event before closing.
- On disconnect, reconnect with **exponential backoff**: 1s → 2s → 4s → 8s → 16s (cap at 60s).
- After reconnect, re-authenticate and re-subscribe to all channels.
- Use the `nextTime` field in OHLC responses to detect missed bars during downtime.

### 3.8 Control Messages

| `action` value | Direction | Meaning |
|---|---|---|
| `auth` | C→S / S→C | Authenticate; response contains `code: 0` on success |
| `subscribe` | C→S | Subscribe to channels |
| `unsubscribe` | C→S | Unsubscribe from channels |
| `ping` | S→C | Server keepalive probe |
| `pong` | C→S | Client keepalive response |
| `connection_expired` | S→C | Connection approaching 8-hour limit; reconnect |
| `error` | S→C | Error response with `code` and `message` |

### 3.9 Order Event Payload (sample)

```json
{
  "action": "order",
  "data": {
    "accountNo": "0001179019",
    "orderId": 123456,
    "symbol": "TCB",
    "side": "NB",
    "orderType": "LO",
    "price": 35000,
    "quantity": 300,
    "fillQuantity": 100,
    "orderStatus": "PartiallyFilled",
    "transDate": "2026-04-16"
  }
}
```

### 3.10 Position Event Payload (sample)

```json
{
  "action": "position",
  "data": {
    "positionId": 789,
    "accountNo": "0001179019",
    "symbol": "VN30F1M",
    "side": "NB",
    "quantity": 5,
    "averagePrice": 1250.3,
    "unrealizedPnL": 320.5
  }
}
```

---

## 4. API Versioning

Pass the `version` header to opt into a specific API release:

```
version: 2026-05-07
```

If omitted, the latest stable version is used. Version dates follow the changelog release dates.

---

## 5. Error Codes (Common)

| HTTP Status | Code | Meaning |
|---|---|---|
| 401 | `unauthorized` | Missing or invalid API key |
| 401 | `timestamp_out_of_range` | `X-Aux-Date` > ±5 min from server time |
| 401 | `invalid_signature` | HMAC mismatch — check key, message construction |
| 403 | `forbidden` | Valid auth but insufficient permissions |
| 400 | `invalid_trading_token` | `trading-token` missing or expired |
| 429 | `rate_limit_exceeded` | Too many requests |
| 404 | `not_found` | Symbol or resource does not exist |
