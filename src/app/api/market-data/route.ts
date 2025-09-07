import mqtt from "mqtt"
import { NextRequest } from "next/server"
import { isTradingHours } from "@/lib/utils"

export const dynamic = "force-dynamic"


async function authenticate(
  username: string,
  password: string
) {
  try {
    const url = "https://api.dnse.com.vn/user-service/api/auth"
    const _json = {
      username: username,
      password: password
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(_json)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    console.log("Authentication successful!")
    const data = await response.json()
    return data.token
  } catch (e) {
    console.error(`Authentication failed: ${e}`)
    return null
  }
}

export async function GET(request: NextRequest) {
  if (!isTradingHours()) {
    return new Response("Market closed", { status: 403 })
  }
  const searchParams = request.nextUrl.searchParams
  const symbols = searchParams.get("symbols")?.split(",") ?? []

  const username = process.env.DNSE_USERNAME
  const password = process.env.DNSE_PASSWORD
  const investorId = process.env.DNSE_INVESTORID

  if (!username || !password || !investorId) {
    return new Response("Missing environment variables for DNSE authentication", { status: 500 })
  }

  const token = await authenticate(username, password)

  if (!token) {
    return new Response("Authentication failed", { status: 401 })
  }

  let client: mqtt.MqttClient

  const stream = new ReadableStream({
    start(controller) {
      const BROKER_HOST = "datafeed-lts-krx.dnse.com.vn"
      const BROKER_PORT = 443
      const CLIENT_ID_PREFIX = "dnse-price-json-mqtt-ws-sub-"
      const clientId = `${CLIENT_ID_PREFIX}${Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000}`

      client = mqtt.connect(`wss://${BROKER_HOST}:${BROKER_PORT}/wss`, {
        clientId,
        username: investorId,
        password: token,
        protocolVersion: 5,
        clean: true,
        reconnectPeriod: 1000,
      })

      client.on("connect", () => {
        console.log("Connected to MQTT Broker!")
        if (symbols.length > 0) {
          symbols.forEach(symbol => {
            client.subscribe(`plaintext/quotes/krx/mdds/tick/v1/roundlot/symbol/${symbol}`, { qos: 1 })
          })
        }
      })

      client.on("message", (topic, message) => {
        try {
          const payload = JSON.parse(message.toString())
          const data = {
            symbol: payload.symbol,
            price: parseFloat(payload.matchPrice),
            quantity: parseInt(payload.matchQtty),
            side: payload.side,
            time: payload.sendingTime
          }
          // Check if the stream is still active before trying to enqueue
          if (controller.desiredSize === null) {
            // Controller is closed
            return
          }
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        } catch (e) {
          console.error("Failed to parse message:", e)
        }
      })

      client.on("error", (error) => {
        console.error("MQTT Client Error:", error)
        try {
          controller.error(error)
        } catch (e) {
          // Ignore errors if controller is already closed
        }
        if (client) {
          client.end()
        }
      })
    },
    cancel() {
      console.log("Client disconnected. Closing MQTT connection.")
      if (client) {
        client.end()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}