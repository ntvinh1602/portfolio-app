import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { headers } = request

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const baseURL = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`price-driven`],
      },
    }

    const [
      twrResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      balanceSheetResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
      monthlyDataResponse,
    ] = await Promise.all([
      fetch(`${baseURL}/api/query/twr`, fetchOptions),
      fetch(`${baseURL}/api/query/pnl`, fetchOptions),
      fetch(`${baseURL}/api/query/equity-chart`, fetchOptions),
      fetch(`${baseURL}/api/query/benchmark-chart`, fetchOptions),
      fetch(`${baseURL}/api/query/balance-sheet`, fetchOptions),
      fetch(`${baseURL}/api/query/stock-holdings`, fetchOptions),
      fetch(`${baseURL}/api/query/crypto-holdings`, fetchOptions),
      fetch(`${baseURL}/api/query/monthly-data`, fetchOptions),
    ])

    for (const response of [
      twrResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      balanceSheetResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
      monthlyDataResponse,
    ]) {
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error fetching dashboard data: ${response.url} - ${response.status} ${response.statusText}`, errorText)
        throw new Error(`Failed to fetch from ${response.url}`)
      }
    }

    const [
      twrData,
      pnlData,
      equityData,
      benchmarkData,
      balanceSheetData,
      stockData,
      cryptoData,
      monthlyData,
    ] = await Promise.all([
      twrResponse.json(),
      pnlResponse.json(),
      equityResponse.json(),
      benchmarkResponse.json(),
      balanceSheetResponse.json(),
      stockHoldingsResponse.json(),
      cryptoHoldingsResponse.json(),
      monthlyDataResponse.json(),
    ])

    return NextResponse.json(
      {
        twrData,
        pnlData,
        equityData,
        benchmarkData,
        balanceSheetData,
        stockData,
        cryptoData,
        monthlyData
      }
    )

  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}