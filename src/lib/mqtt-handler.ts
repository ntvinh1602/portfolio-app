// src/lib/mqtt-handler.ts
import mqtt from 'mqtt'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let client: mqtt.MqttClient | null = null

interface MarketData {
  symbol: string
  match_price: number
  match_quantity: number
  side: string
  sending_time: string
}

async function getDnseToken(username: string, password: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.dnse.com.vn/user-service/api/auth", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Authentication failed')
    console.log("Authentication successful!")
    return data.token
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Authentication failed: ${error.message}`)
    } else {
      console.error('An unknown authentication error occurred')
    }
    return null
  }
}

export async function connectMqtt() {
  if (client && client.connected) {
    console.log('MQTT client is already connected.')
    return
  }

  const token = await getDnseToken(process.env.DNSE_USERNAME!, process.env.DNSE_PASSWORD!)
  if (!token) return

  const investorId = process.env.DNSE_INVESTORID
  if (!investorId) {
    console.error('DNSE_INVESTORID is not set in environment variables.')
    return
  }

  const BROKER_HOST = "datafeed-lts-krx.dnse.com.vn"
  const BROKER_PORT = 443
  const clientId = `dnse-price-json-mqtt-ws-sub-${Math.floor(Math.random() * 1000)}`

  client = mqtt.connect(`wss://${BROKER_HOST}:${BROKER_PORT}/wss`, {
    clientId,
    username: investorId,
    password: token,
    protocolVersion: 5,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  })

  client.on('connect', () => {
    console.log('Connected to DNSE MQTT Broker!')
    
    if (client) {
      client.subscribe('plaintext/quotes/krx/mdds/stockinfo/v1/roundlot/HPG', { qos: 1 }, (err) => {
          if(err) {
              console.error('Subscription error:', err)
          } else {
              console.log('Subscribed successfully!')
          }
      })
    }
  })

  client.on('message', async (topic, message) => {
    // Log raw message to confirm receipt
    console.log(`Raw message received on topic ${topic}: ${message.toString()}`);
    try {
      const payload = JSON.parse(message.toString())
      console.log(`Parsed message from ${topic}:`, payload)

      const marketData: MarketData = {
        symbol: payload.symbol,
        match_price: parseFloat(payload.matchPrice),
        match_quantity: parseInt(payload.matchQtty, 10),
        side: payload.side,
        sending_time: payload.sendingTime,
      }

      const { error } = await supabase.from('live_stock_prices').upsert([marketData], { onConflict: 'symbol' })

      if (error) {
        console.error('Error inserting data to Supabase:', error)
      } else {
        console.log('Successfully inserted data to Supabase.')
      }
    } catch (e) {
      console.error('Error processing message:', e)
    }
  })

  client.on('error', (err) => {
    console.error('MQTT Client Error:', err)
    if (client) {
      client.end()
    }
  })

  client.on('close', () => {
    console.log('MQTT connection closed.')
  })
}