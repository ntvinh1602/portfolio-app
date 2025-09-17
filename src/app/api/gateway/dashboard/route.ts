import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const expectedSecret = process.env.MY_APP_SECRET

    if (!expectedSecret) {
      const errorMsg = "Server misconfigured: missing MY_APP_SECRET"
      console.error(errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    const baseURL = request.url.split("/api")[0]

    // Prepare fetch options with the server-side secret
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${expectedSecret}`,
      },
      next: {
        revalidate: 600,
        tags: [`dashboard`],
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
      fetch(`${baseURL}/api/internal/twr`, fetchOptions),
      fetch(`${baseURL}/api/internal/pnl`, fetchOptions),
      fetch(`${baseURL}/api/internal/equity-chart`, fetchOptions),
      fetch(`${baseURL}/api/internal/benchmark-chart`, fetchOptions),
      fetch(`${baseURL}/api/internal/balance-sheet`, fetchOptions),
      fetch(`${baseURL}/api/internal/stock-holdings`, fetchOptions),
      fetch(`${baseURL}/api/internal/crypto-holdings`, fetchOptions),
      fetch(`${baseURL}/api/internal/monthly-data`, fetchOptions),
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

    return NextResponse.json({
      twrData,
      pnlData,
      equityData,
      benchmarkData,
      balanceSheetData,
      stockData,
      cryptoData,
      monthlyData
    })

  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}