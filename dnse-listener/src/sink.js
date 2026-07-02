const MAX_UPSERT_ATTEMPTS = 3
const RETRY_DELAYS_MS = [250, 750]

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function requireFiniteNumber(value, fieldName) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName} value: ${value}`)
  }

  return parsed
}

function toIsoTimestamp(seconds, fieldName) {
  return new Date(requireFiniteNumber(seconds, fieldName) * 1000).toISOString()
}

export function toBarRow(message) {
  return {
    symbol: String(message.symbol ?? "").trim().toUpperCase(),
    resolution: String(message.resolution ?? "").trim(),
    bar_time: toIsoTimestamp(message.time, "time"),
    open: requireFiniteNumber(message.open, "open"),
    high: requireFiniteNumber(message.high, "high"),
    low: requireFiniteNumber(message.low, "low"),
    close: requireFiniteNumber(message.close, "close"),
    volume: Math.trunc(requireFiniteNumber(message.volume, "volume")),
    type: message.type ? String(message.type).trim().toUpperCase() : null,
    last_updated:
      message.lastUpdated === undefined || message.lastUpdated === null
        ? null
        : toIsoTimestamp(message.lastUpdated, "lastUpdated"),
  }
}

export function createBarSink({ supabaseUrl, serviceRoleKey, logger }) {
  async function upsertClosedBar(message) {
    let row

    try {
      row = toBarRow(message)
    } catch (error) {
      logger.error("sink.invalid_bar", error)
      return false
    }

    if (!row.symbol || !row.resolution) {
      logger.error("sink.invalid_bar_identity", {
        symbol: row.symbol,
        resolution: row.resolution,
      })
      return false
    }

    for (let attempt = 1; attempt <= MAX_UPSERT_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/ohlc_bars`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(row),
        })

        if (response.ok) {
          logger.debug("sink.upsert_success", {
            symbol: row.symbol,
            resolution: row.resolution,
            bar_time: row.bar_time,
          })
          return true
        }

        const body = await response.text()
        if (attempt === MAX_UPSERT_ATTEMPTS) {
          logger.error("sink.drop_bar", {
            attempt,
            symbol: row.symbol,
            resolution: row.resolution,
            bar_time: row.bar_time,
            status: response.status,
            body,
          })
          return false
        }

        logger.warn("sink.retry_bar", {
          attempt,
          symbol: row.symbol,
          resolution: row.resolution,
          bar_time: row.bar_time,
          status: response.status,
          body,
        })
      } catch (error) {
        if (attempt === MAX_UPSERT_ATTEMPTS) {
          logger.error("sink.drop_bar", {
            attempt,
            symbol: row.symbol,
            resolution: row.resolution,
            bar_time: row.bar_time,
            error_name: error instanceof Error ? error.name : "Error",
            error_message:
              error instanceof Error ? error.message : "Unknown sink error",
          })
          return false
        }

        logger.warn("sink.retry_bar", {
          attempt,
          symbol: row.symbol,
          resolution: row.resolution,
          bar_time: row.bar_time,
          error_message:
            error instanceof Error ? error.message : "Unknown sink error",
        })
      }

      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1) ?? 1000)
    }

    return false
  }

  return {
    upsertClosedBar,
  }
}
