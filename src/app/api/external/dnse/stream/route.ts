// app/api/dnse/stream/route.ts
import mqtt from "mqtt"
import { NextRequest } from "next/server"
import { isTradingHours } from "@/lib/utils"

export async function GET(request: NextRequest) {
  if (!isTradingHours()) {
    return new Response("Market closed", { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const symbols = searchParams.get("symbols")?.split(",") ?? []
  const token = searchParams.get("token")
  const investorId = process.env.DNSE_INVESTORID

  if (!token || !investorId) {
    return new Response("Missing token or investorId", { status: 400 })
  }

  let client: mqtt.MqttClient

  const stream = new ReadableStream({
    start(controller) {
      const BROKER_HOST = "datafeed-lts-krx.dnse.com.vn"
      const clientId = `dnse-stream-${Date.now()}`

      client = mqtt.connect(`wss://${BROKER_HOST}:443/wss`, {
        clientId,
        username: investorId,
        password: token,
        protocolVersion: 5,
        clean: true,
        reconnectPeriod: 1000,
      })

      client.on("connect", () => {
        symbols.forEach(symbol => {
          client.subscribe(`plaintext/quotes/krx/mdds/tick/v1/roundlot/symbol/${symbol}`, { qos: 1 })
        })
      })

      client.on("message", (_, message) => {
        try {
          const payload = JSON.parse(message.toString())
          const data = {
            symbol: payload.symbol,
            price: parseFloat(payload.matchPrice),
            quantity: parseInt(payload.matchQtty),
            side: payload.side,
            time: payload.sendingTime,
          }
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        } catch (e) {
          console.error("Parse error", e)
        }
      })

      client.on("error", (err) => {
        controller.error(err)
        client.end()
      })
    },
    cancel() {
      client?.end()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
