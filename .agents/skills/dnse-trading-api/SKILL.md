---
name: dnse-trading-api
description: >
  Comprehensive knowledge reference for the DNSE LightSpeed OpenAPI (Vietnam stock trading platform).
  Use this skill whenever the user asks about DNSE API integration, trading platform development with DNSE,
  authentication/signature generation for DNSE, placing/modifying/canceling stock orders via DNSE,
  querying account balances or positions via DNSE, retrieving market data (OHLC, bid/ask, trades) from DNSE,
  WebSocket streaming with DNSE, or any endpoint/parameter details for the DNSE REST or WebSocket API.
  Also trigger when the user asks: "how do I place a trade with DNSE?", "what headers does DNSE require?",
  "how does DNSE WebSocket authentication work?", "what is the DNSE base URL?", or any question referencing
  openapi.dnse.com.vn or developers.dnse.com.vn.
---

# DNSE LightSpeed OpenAPI — Knowledge Reference

**Base REST URL:** `https://openapi.dnse.com.vn`  
**Base WebSocket URL:** `wss://ws-openapi.dnse.com.vn`  
**Developer Docs:** https://developers.dnse.com.vn/docs/dnse/account

---

## Authentication Overview

All REST API calls require three mandatory headers:

| Header | Description |
|---|---|
| `X-API-Key` | Unique API Key issued on registration |
| `X-Aux-Date` | Request timestamp, e.g. `Mon, 19 Jan 2026 07:45:23 +0000` |
| `X-Signature` | HMAC-SHA256 digital signature |
| `version` (optional) | API version date, e.g. `2026-05-07` |

**Security model — multi-layer:**
1. **API Key** — unique identifier; treat like a username; can be revoked/rotated at any time.
2. **API Secret** — used to generate the HMAC-SHA256 `X-Signature`; shown only once at registration; never sent in requests.
3. **2FA / Trading Token** — required for order placement; valid 8 hours. Choose Smart OTP or Email OTP.

> Security credentials must never be shared. Rotating API Key immediately invalidates the old key.

For full signature generation details → see `references/auth-and-websocket.md`.

---

## API Sections Overview

| Section | Base path | Endpoints |
|---|---|---|
| Account Info | `/accounts` | balances, trading accounts, loan packages, buying power, order book, executions, order history, positions, PnL configs, corporate actions |
| Trading | `/accounts/orders`, `/registration`, `/accounts/positions` | OTP, trading token, place/modify/cancel/close orders, set take-profit/stop-loss |
| Market Data | `/price`, `/instruments`, `/market` | secdef, close price, instruments, OHLC, trades, quotes, working dates, foreign trading, trading session |
| Broker | `/brokers` | Managed sub-accounts list |

---

## Section 1 — Account Information

### GET Account Balances
**Endpoint:** `GET /accounts/:accountNo/balances`  
Query sub-account balance including base and derivative assets.

**Path:** `accountNo` (string, REQUIRED) — e.g. `0001179019`  
**Headers:** `X-API-Key`, `X-Aux-Date`, `X-Signature` (all REQUIRED)  
**Response schema:** `{ stock: object, derivative: object }`

---

### GET Trading Accounts
**Endpoint:** `GET /accounts`  
Query user identity and list of trading sub-accounts.

**Headers:** `X-API-Key`, `X-Aux-Date`, `X-Signature` (all REQUIRED)  
**Response schema:**
```
name: string          // Full name
custodyCode: string   // VSD custody code, e.g. "064CSUN032"
investorId: string    // DNSE investor ID, e.g. "1000005917"
accounts: object[]
```

---

### GET Loan Packages
**Endpoint:** `GET /accounts/:accountNo/loan-packages`  
Query loan packages for order placement by symbol.

- For **STOCK**: returns up to 2 packages — cash (initialRate=1) and margin (initialRate≠1)
- For **DERIVATIVE**: single package for all symbols

**Path:** `accountNo` (string, REQUIRED)  
**Query:** `marketType` (STOCK|DERIVATIVE, REQUIRED), `symbol` (REQUIRED)  
**Response schema:** `{ symbolType, marketType, loanPackages: object[] }`

`symbolType` values (derivative): `VN30F1M`, `VN30F2M`, `VN30F1Q`, `VN30F2Q`

---

### GET Buying/Selling Power (PPSE)
**Endpoint:** `GET /accounts/:accountNo/ppse`  
Get maximum buy/sell quantity for a symbol given a loan package and price.

**Path:** `accountNo` (integer, REQUIRED)  
**Query:** `marketType` (REQUIRED), `symbol` (REQUIRED), `loanPackageId` (REQUIRED), `price` (REQUIRED)  
**Response:** `{ qmaxBuy: int32, qmaxSell: int32, price: double }`

---

### GET Order Book (Today)
**Endpoint:** `GET /accounts/:accountNo/orders`  
Get today's orders by market type.

**Path:** `accountNo` (string, REQUIRED)  
**Query:** `marketType` (STOCK|DERIVATIVE, REQUIRED), `orderCategory` (NORMAL by default, REQUIRED)  
**Response:** `{ orders: object[] }`

---

### GET Order Execution Details
**Endpoint:** `GET /accounts/:accountNo/executions/:orderId`  
Get history of status updates or partial fills for an order. **Derivative only.**

**Path:** `accountNo` (integer), `orderId` (integer) — both REQUIRED  
**Query:** `marketType` (DERIVATIVE only supported), `orderCategory` (REQUIRED)  
**Response fields:** `id, side (NB/NS), symbol, price, quantity, orderType, orderStatus, fillQuantity, lastPrice, averagePrice, transDate, reports: object[]` + more

**orderStatus values:** `Pending/PendingNew`, `New`, `PartiallyFilled`, `Filled`, `Rejected`, `Expired`, `DoneForDay`

---

### GET Order History
**Endpoint:** `GET /accounts/:accountNo/orders/history`  
Get orders placed over a date range. Max lookback: 1 year.

**Path:** `accountNo` (string, REQUIRED)  
**Query:** `marketType` (REQUIRED), `from` (yyyy-mm-dd, REQUIRED), `to` (yyyy-mm-dd, REQUIRED)  
**Response:** `{ accountNo, fillQuantity, total, start, end, marketType, data: object[] }`

---

### GET Positions (Holdings)
**Endpoint:** `GET /accounts/:accountNo/positions`  
Get all currently held positions.

**Path:** `accountNo` (string, REQUIRED)  
**Query:** `marketType` (STOCK|DERIVATIVE, REQUIRED), `pageSize` (REQUIRED)  
**Response:** `{ positions: object[], pageIndex, pageSize, pageNumber, total }` (pagination fields for derivatives only)

---

### GET Position by ID
**Endpoint:** `GET /accounts/positions/:positionId`  
Get detailed info for one open position.

**Path:** `positionId` (integer, REQUIRED)  
**Query:** `marketType` (REQUIRED)  
**Response:** `{ data: object }`

---

### GET PnL Config for Position
**Endpoint:** `GET /accounts/positions/:positionId/pnl-configs`  
Get take-profit/stop-loss configuration for an open position. **Derivative only.**

**Path:** `positionId` (integer, REQUIRED)  
**Query:** `marketType` (DERIVATIVE only, REQUIRED)  
**Response:** `{ accountNo, positionId, configs: object, createdDate, modifiedDate }`

---

### GET Corporate Action History
**Endpoint:** `GET /accounts/:accountNo/corporate-action-history`  
Get corporate action event history (dividends, stock bonuses, rights offerings).

**Path:** `accountNo` (integer, REQUIRED)  
**Query (optional):** `symbol`, `caType` (cashDividend|stockDividend|stockBonus|rightsOffering), `caStatus` (pending|completed|canceled), `pageIndex`, `pageSize`  
**Response:** `{ accountNo, data: object, pagination: object }`

---

## Section 2 — Trading

### Authentication Flow (required before placing orders)

**Step 1 — Send Email OTP (if using Email OTP)**  
`POST /registration/send-email-otp`  
Trigger OTP email. Only for accounts with Email OTP 2FA.  
**Headers:** `X-API-Key`, `X-Aux-Date`, `X-Signature` (all REQUIRED)  
No body required.

**Step 2 — Verify OTP → get Trading Token**  
`POST /registration/trading-token`  
Exchange OTP for a Trading Token (valid 8 hours).  
**Body:**
```json
{
  "otpType": "email_otp",  // or "smart_otp"
  "passcode": "519752"
}
```
**Response:** `{ tradingToken: string }`

The `tradingToken` must be passed as the `trading-token` header on all order-related endpoints.

---

### POST Place Order
**Endpoint:** `POST /accounts/orders`  
Place a base or derivative order.

**Query:** `marketType` (STOCK|DERIVATIVE, REQUIRED), `orderCategory` (NORMAL, REQUIRED)  
**Headers:** `X-API-Key`, `X-Signature`, `X-Aux-Date` (all REQUIRED), `trading-token` (REQUIRED)  
**Body:**
```json
{
  "accountNo": "0001179019",
  "loanPackageId": 2278,
  "orderType": "LO",
  "price": 35000,
  "quantity": 300,
  "side": "NB",
  "symbol": "TCB"
}
```

**orderType values:** `LO` (limit), `MOK/MAK/MTL` (market), `ATO/ATC` (open/close periodic), `PLO` (post-session)  
**side values:** `NB` (buy), `NS` (sell)  
**orderStatus values:** `PendingNew`, `New`, `PendingReplace`, `PartiallyFilled`, `Filled`, `Canceled`, `Rejected`, `Expired`, `DoneForDay`

---

### PUT Modify Order
**Endpoint:** `PUT /accounts/:accountNo/orders/:orderId`  
Modify price and/or quantity of an existing order.

- **STOCK:** can modify both price and quantity simultaneously (cancel + re-place)
- **DERIVATIVE:** can only modify price OR quantity (not both); new quantity must exceed already-filled quantity

**Path:** `accountNo` (string), `orderId` (integer) — both REQUIRED  
**Query:** `marketType`, `orderCategory` (REQUIRED)  
**Headers:** `X-API-Key`, `X-Signature`, `X-Aux-Date`, `trading-token` (all REQUIRED)  
**Body:** `{ price: double, quantity: int32 }`

---

### DELETE Cancel Order
**Endpoint:** `DELETE /accounts/:accountNo/orders/:orderId`

**Path:** `accountNo` (string), `orderId` (integer) — both REQUIRED  
**Query:** `marketType`, `orderCategory` (REQUIRED)  
**Headers:** `X-API-Key`, `X-Signature`, `X-Aux-Date`, `trading-token` (all REQUIRED)  
**Response:** Full order object with `orderStatus: "PendingCancel"` → `"Canceled"`

---

### GET Order Detail by ID
**Endpoint:** `GET /accounts/:accountNo/orders/:orderId`  
Get detailed info for a specific order.

**Path:** `accountNo` (string), `orderId` (integer) — both REQUIRED  
**Query:** `marketType`, `orderCategory` (REQUIRED)  
**Response fields:** `id, side, symbol, price, quantity, orderType, orderStatus, fillQuantity, lastPrice, averagePrice, reports: []` + more

---

### POST Close Position (Derivative)
**Endpoint:** `POST /accounts/positions/:positionId/close`  
Close an open derivative position. Places a reverse LO order at ceiling/floor price for full position size.

**Path:** `positionId` (string, REQUIRED)  
**Query:** `marketType` (DERIVATIVE only, REQUIRED)  
**Headers:** `X-API-Key`, `X-Signature`, `X-Aux-Date`, `trading-token` (all REQUIRED)

---

### POST Set Take-Profit / Stop-Loss
**Endpoint:** `POST /accounts/positions/:positionId/pnl-configs`  
Set take-profit and stop-loss configuration for a held position. Recommend sending all fields.

**Path:** `positionId` (integer, REQUIRED)  
**Query:** `marketType` (optional, default DERIVATIVE)  
**Headers:** `X-API-Key`, `X-Aux-Date`, `X-Signature` (REQUIRED), `trading-token` (optional)  
**Body example:**
```json
{
  "takeProfit": {
    "enabled": true,
    "strategy": "DELTA_PRICE",
    "rate": 0.52,
    "deltaPrice": 162.8,
    "orderMethod": "FASTEST",
    "orderDeltaPrice": 2
  },
  "stopLoss": {
    "enabled": true,
    "strategy": "PNL_RATE",
    "rate": -0.34,
    "deltaPrice": 50.3,
    "orderMethod": "DELTA_PRICE",
    "orderDeltaPrice": 10.5,
    "trailingEnabled": true
  }
}
```
**Response:** `{ accountNo, positionId, configs: object, createdDate, modifiedDate }`

---

## Section 3 — Market Data

### GET Security Definition (Secdef)
**Endpoint:** `GET /price/:symbol/secdef`  
Get ceiling/floor/reference price and trading status for a symbol on a given trading day.

**Path:** `symbol` (REQUIRED)  
**Query:** `boardId` (optional) — G1, G4, T1, T3, T4, T6  
**Response array fields:** `marketId, boardId, isin, symbol, productGrpId, securityGroupId, basicPrice, ceilingPrice, floorPrice, securityStatus, symbolAdminStatusCode, symbolTradingMethodStatusCode, listingDate, time`

**marketId values:** `DVX` (derivative HNX), `HCX` (corp bond HNX), `STO` (HOSE), `STX` (HNX), `UPX` (Upcom)

---

### GET Close Price
**Endpoint:** `GET /price/:symbol/close`  
Get closing price for a symbol in the current trading session.

**Path:** `symbol` (REQUIRED) | **Query:** `boardId` (optional)  
**Response:** `{ prices: object[] }`

---

### GET Instruments (Securities List)
**Endpoint:** `GET /instruments`  
Query list of securities with filtering.

**Query (all optional):** `symbol` (comma-separated), `marketId` (STO|STX|UPX|DVX|HCX), `securityGroupId` (ST|EF|EW|FU|BS), `indexName` (VN30|VN100|HNX30), `limit`, `page`  
**Response:** `{ data: object[], total, page, pageSize }`

---

### GET OHLC History (Candlestick)
**Endpoint:** `GET /price/ohlc`  
Get historical candlestick data for stocks, derivatives, or indices.

**Query (all REQUIRED):** `symbol`, `type` (STOCK|DERIVATIVE|INDEX), `resolution` (1,3,5,15,30,1h,1D,1W), `from` (Unix timestamp), `to` (Unix timestamp)  
**Response:** `{ t: int[], o: number[], h: number[], l: number[], c: number[], v: int[], nextTime: int32 }`

---

### GET Trade History
**Endpoint:** `GET /price/:symbol/trades`  
Get historical trade matches for a symbol. Range must not exceed 1 day.

**Path:** `symbol` (REQUIRED)  
**Query:** `boardId` (REQUIRED), `from` (timestamp, REQUIRED), `to` (timestamp, REQUIRED), `limit` (optional)  
**Response:** `{ trades: object[], nextPageToken: string }`

---

### GET Latest Trades
**Endpoint:** `GET /price/:symbol/trades/latest`  
Get most recent trade matches.

**Path:** `symbol` (REQUIRED) | **Query:** `boardId` (REQUIRED)  
**Response:** `{ trades: object[] }`

---

### GET Bid/Ask History (Quotes)
**Endpoint:** `GET /price/:symbol/quotes`  
Get historical order book depth data. Range must not exceed 1 day.

**Path:** `symbol` (REQUIRED)  
**Query:** `from` (timestamp, REQUIRED), `to` (timestamp, REQUIRED), `boardId` (optional), `limit` (optional)  
**Response:** `{ quotes: object[], nextPageToken: string }`

---

### GET Latest Bid/Ask
**Endpoint:** `GET /price/:symbol/quotes/latest`  
Get most recent bid/ask data.

**Path:** `symbol` (REQUIRED) | **Query:** `boardId` (optional)  
**Response:** `{ quotes: object[] }`

---

### GET Market Working Dates
**Endpoint:** `GET /market/working-dates`  
Returns list of trading days within 1 year from today, excluding weekends and holidays.

**Response:** `{ workingDates: string[] }` — e.g. `["2026-04-16"]`

---

### GET Foreign Investor Trading Data
**Endpoint:** `GET /price/:symbol/foreign-trading`  
Query foreign investor buy/sell data for a symbol.

**Path:** `symbol` (REQUIRED)  
**Query:** `from` (timestamp, REQUIRED), `to` (timestamp, max 1 day, REQUIRED), `boardId`, `limit`, `order` (ASC|DESC)  
**Response:** `{ foreigners: object[], nextPageToken: string }`

---

### GET Trading Session
**Endpoint:** `GET /market/trading-session`  
Query current trading session info.

**Query:** `tscProdGrpId` (REQUIRED) — FBX, FIO, HCX, STO, STX, UPX; `boardId` (optional)  
**Response:** `{ tradingSessions: object[] }`

---

## Section 4 — Broker

### GET Managed Sub-Accounts
**Endpoint:** `GET /brokers/accounts/care-by`  
Query sub-accounts under a Broker/SACO's management, including asset values and permissions.

**Headers:** `X-API-Key`, `X-Aux-Date`, `X-Signature` (all REQUIRED)  
**Response:** `{ careBy: object[], total: int32 }`

---

## Common Enums

### boardId (Trading Board)
| Value | Description |
|---|---|
| G1 | Round lot |
| G4 | Odd lot |
| T1 | Negotiated (in-hours, 9h–14h45) |
| T3 | Negotiated (after-hours, 14h45–15h) |
| T4 | Negotiated odd lot (in-hours) |
| T6 | Negotiated odd lot (after-hours) |

### marketId
| Value | Description |
|---|---|
| STO | HOSE equities |
| STX | HNX equities |
| UPX | Upcom equities |
| DVX | Derivative (HNX) |
| HCX | Corporate bond (HNX) |

### orderType
| Value | Description |
|---|---|
| LO | Limit order |
| MOK | Market or kill |
| MAK | Market and kill |
| MTL | Market to limit |
| ATO | At-the-open (periodic) |
| ATC | At-the-close (periodic) |
| PLO | Post-session limit order |

### OHLC resolution
`1`, `3`, `5`, `15`, `30`, `1h`, `1D`, `1W`

---

## WebSocket Reference

For full WebSocket protocol details (connection, authentication, subscribe/unsubscribe, PING/PONG, reconnection, all channel names and payload schemas) → see `references/auth-and-websocket.md`.

**Quick summary:**
- Connect: `wss://ws-openapi.dnse.com.vn/v1/stream?encoding={json|msgpack}`
- Auth within 30 seconds using HMAC-SHA256 signature
- Connection max duration: **8 hours** (reconnect after `connection_expired`)
- Server PING every 3 min; client must PONG within 60 seconds

---

## Recent Changelog (as of 2026-06-30)

- **2026-06-30:** Added GET Session endpoint; WebSocket Position Event for Broker and Session channel
- **2026-06-23:** Added GET Foreign Trading endpoint
- **2026-06-11:** WebSocket Order Event for Broker, Estimate VN30 Data channels added
- **2026-06-04:** Added GET/POST PnL Configs endpoints; GET List Care By response includes `investorId`
- **2026-05-28:** Added GET Corporate Action History, GET Latest Quotes, GET Quotes; PPSE response adds `pp0Buy`, `pp0Short`
- **2026-05-12:** API Versioning launched; WebSocket Position Event added; GET Positions response adds `averageClosePrice`
- **2026-04-07:** WebSocket OHLC Closed, Foreign Investor channels; REST Executions, Close Price endpoints added; **Breaking:** WebSocket field naming changed from snake_case to camelCase; enum fields changed from int to string
