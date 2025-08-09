import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import fs from 'fs'
import path from 'path'

const STATE_FILE = path.join(process.cwd(), 'websocket.state.json')
const STREAM_NAME = 'btcusdt@kline_1s'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let ws: WebSocket | null = null
let subscriptionId = 1
let keepAliveInterval: NodeJS.Timeout
let lastUpsertTime = 0

function startWebSocket() {
  if (ws) return

  ws = new WebSocket('wss://stream.binance.com:9443/stream')

  ws.on('open', () => {
    console.log('Connected to Binance WebSocket.')
    const payload = {
      method: "SUBSCRIBE",
      params: [STREAM_NAME],
      id: subscriptionId++
    }
    ws!.send(JSON.stringify(payload))
  })

  ws.on('message', async (data: WebSocket.Data) => {
    const message = JSON.parse(data.toString())
    if (message.stream === STREAM_NAME && message.data.e === 'kline') {
      const price = parseFloat(message.data.k.c)
      const trade_time = new Date(message.data.E).toISOString()

      const currentTime  = Date.now()
      const THROTTLE_INTERVAL = 10 * 1000 // 10 seconds in milliseconds

      if (currentTime  - lastUpsertTime >= THROTTLE_INTERVAL) {
        await supabase
          .from('live_securities_data')
          .upsert({
            symbol: "BTC",
            price,
            trade_time,
            asset: "crypto"
          }, { onConflict: 'symbol, asset' })

        lastUpsertTime = currentTime
        console.log(`Upserted price for BTC at ${trade_time}`)
      }
    }
  })

  ws.on('close', () => {
    console.log('WebSocket connection closed.')
    ws = null
    clearInterval(keepAliveInterval)
    // If the state file still exists, try to reconnect.
    if (fs.existsSync(STATE_FILE)) {
      setTimeout(startWebSocket, 5000)
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
    ws?.close()
  })

  keepAliveInterval = setInterval(() => {
    if (!fs.existsSync(STATE_FILE)) {
      console.log('State file not found. Closing WebSocket.')
      ws?.close()
    }
  }, 5000)
}

export function connectCryptoFeed() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ active: true }))
  }
  startWebSocket()
}

export function disconnectCryptoFeed() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE)
  }
  console.log('Crypto feed stop signal sent.')
}