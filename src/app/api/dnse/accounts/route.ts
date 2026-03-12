import { DNSEClient } from "@/lib/dnse"
import { NextResponse } from "next/server"

const client = new DNSEClient({
  apiKey: process.env.DNSE_API_KEY!,
  apiSecret: process.env.DNSE_API_SECRET!,
  baseUrl: "https://openapi.dnse.com.vn",
})

export async function GET() {
  const { status, body } = await client.getAccounts({dryRun: true})

  return NextResponse.json({
    status,
    body,
  })
}