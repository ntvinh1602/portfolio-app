import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const expectedSecret = process.env.MY_APP_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!expectedSecret || !supabaseUrl || !serviceRoleKey) {
      throw new Error("Server misconfigured: missing one or more env vars")
    }

    const baseURL = request.url.split("/api")[0]

    const fetchOptions = {
      headers: { Authorization: `Bearer ${expectedSecret}` },
      next: { revalidate: 600, tags: ["dashboard"] }
    }

    const fetchSupabaseOptions = {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      next: { revalidate: 600, tags: ["dashboard"] }
    }

    const [
      twrResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
      balancesheetResponse,
      monthlyResponse
    ] = await Promise.all([
      fetch(`${baseURL}/api/internal/twr`, fetchOptions),
      fetch(`${baseURL}/api/internal/pnl`, fetchOptions),
      fetch(`${baseURL}/api/internal/equity-chart`, fetchOptions),
      fetch(`${baseURL}/api/internal/benchmark-chart`, fetchOptions),
      fetch(`${baseURL}/api/internal/stock-holdings`, fetchOptions),
      fetch(`${baseURL}/api/internal/crypto-holdings`, fetchOptions),
      fetch(`${supabaseUrl}/rest/v1/balance_sheet?select=*`, fetchSupabaseOptions),
      fetch(`${supabaseUrl}/rest/v1/monthly_snapshots?select=*`, fetchSupabaseOptions),
    ])

    for (const response of [
      twrResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
      balancesheetResponse,
      monthlyResponse
    ]) {
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }
    }

    const [
      twrData,
      pnlData,
      equityData,
      benchmarkData,
      stockData,
      cryptoData,
      balanceSheetData,
      monthlyData

    ] = await Promise.all([
      twrResponse.json(),
      pnlResponse.json(),
      equityResponse.json(),
      benchmarkResponse.json(),
      stockHoldingsResponse.json(),
      cryptoHoldingsResponse.json(),
      balancesheetResponse.json(),
      monthlyResponse.json()
    ])
    
    return NextResponse.json({
      twrData,
      pnlData,
      equityData,
      benchmarkData,
      balanceSheetData,
      stockData,
      cryptoData,
      monthlyData,
    })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
