# DNSE VPS Proxy Architecture

## Overview

The DNSE OpenAPI (`openapi.dnse.com.vn`) is geo-blocked outside Vietnam. A reverse proxy on a Vietnamese VPS forwards API requests from our Next.js app (local dev or Vercel) to the real DNSE endpoint.

```
Next.js (local/Vercel)  ──HTTP──►  VPS Caddy Proxy (VN)  ──HTTPS──►  openapi.dnse.com.vn
                                     :8080
                                     X-Proxy-Key auth
```

## Components

### Caddy (reverse proxy)

**Purpose:** Accept HTTP requests from Next.js, authenticate via `X-Proxy-Key`, forward to DNSE API.

**Config file:** `/etc/caddy/Caddyfile`

```caddy
:8080 {
    @unauthorized {
        not header "X-Proxy-Key" "<proxy-key>"
    }
    respond @unauthorized 403

    reverse_proxy https://openapi.dnse.com.vn {
        header_up -X-Proxy-Key
        header_up Host openapi.dnse.com.vn
    }
}
```

**How it works:**
1. Client sends request with `X-Proxy-Key` header
2. Caddy checks the key — returns `403` if missing/invalid
3. Strips `X-Proxy-Key` before forwarding (DNSE never sees it)
4. Forwards all other headers (X-API-Key, X-Signature, Date, etc.)
5. Returns DNSE response to client

**Service management:**
```bash
systemctl status caddy
systemctl restart caddy
journalctl -u caddy -f          # live logs
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile  # syntax check
```

### Firewall (UFW)

Ports open:
- `22/tcp` — SSH
- `8080/tcp` — Caddy proxy

```bash
ufw status
```

### SSH Key Auth

Public key in `~/.ssh/authorized_keys` on VPS. Password auth is disabled after key setup.

## Client Configuration

### Environment Variables (`.env`)

```bash
DNSE_API_BASE_URL=
DNSE_PROXY_KEY=
```

### How `requestDnse` uses the proxy

In `src/lib/dnse/client.ts`:

1. Reads `DNSE_API_BASE_URL` — if set, requests go to VPS instead of DNSE directly
2. Reads `DNSE_PROXY_KEY` — if set, adds `X-Proxy-Key` header to every request
3. HMAC signature is computed over the **path only** (not the host), so proxying doesn't break it
4. When unset, requests go directly to `https://openapi.dnse.com.vn` (for when running from a VN IP)

### Flow

```
requestDnse("GET", "/accounts")
  → fetch("http://xxx.xx.xxx.xxx:xxxx/accounts", {
      headers: {
        "X-Proxy-Key": "...",
        "X-API-Key": "...",
        "X-Signature": "...",
        "Date": "...",
        "version": "2026-05-07"
      }
    })
  → Caddy strips X-Proxy-Key, forwards to openapi.dnse.com.vn/accounts
  → DNSE responds with account data
  → Caddy returns response to Next.js
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `NETWORK_ERROR` | VPS unreachable or Caddy down | `ssh root@<vps-ip> systemctl restart caddy` |
| `403 Forbidden` | Wrong or missing `X-Proxy-Key` | Check `.env` has correct `DNSE_PROXY_KEY` |
| `401 Unauthorized` | DNSE rejected the request | Check `DNSE_API_KEY` / `DNSE_API_SECRET` are valid |
| `502 Bad Gateway` | Caddy can't reach DNSE | DNS issue on VPS — `ssh root@<vps-ip> dig openapi.dnse.com.vn` |
| Timeout | Firewall blocking | `ssh root@<vps-ip> ufw status` |

## Security Notes

- Proxy key is a 64-char hex string (generated via `openssl rand -hex 32`)
- `X-Proxy-Key` is stripped before forwarding to DNSE — the API never sees it
- No TLS between Next.js and VPS (internal server-to-server traffic)
- DNSE API key/secret remain in `.env` only — never committed to git
- If VPS credentials are compromised: rotate SSH keys, change proxy key, check Caddy access logs
