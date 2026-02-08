import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Utility function to fetch data from Supabase REST API
 */
async function fetchSupabaseTable(table: string, serviceRoleKey: string, supabaseUrl: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
    next: { revalidate: 600, tags: ["dashboard"] },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Supabase API error (${table}): ${err}`)
  }

  return response.json()
}

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
      next: { revalidate: 600, tags: ["dashboard"] },
    }

    // ✅ Fetch from Supabase REST API directly (both balance_sheet & monthly_snapshots)
    const [balanceSheetData, monthlyData] = await Promise.all([
      fetchSupabaseTable("balance_sheet", serviceRoleKey, supabaseUrl),
      fetchSupabaseTable("monthly_snapshots", serviceRoleKey, supabaseUrl),
    ])

    // ✅ Fetch internal API data (still handled via internal endpoints)
    const [
      twrResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
    ] = await Promise.all([
      fetch(`${baseURL}/api/internal/twr`, fetchOptions),
      fetch(`${baseURL}/api/internal/pnl`, fetchOptions),
      fetch(`${baseURL}/api/internal/equity-chart`, fetchOptions),
      fetch(`${baseURL}/api/internal/benchmark-chart`, fetchOptions),
      fetch(`${baseURL}/api/internal/stock-holdings`, fetchOptions),
      fetch(`${baseURL}/api/internal/crypto-holdings`, fetchOptions),
    ])

    for (const response of [
      twrResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
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
    ] = await Promise.all([
      twrResponse.json(),
      pnlResponse.json(),
      equityResponse.json(),
      benchmarkResponse.json(),
      stockHoldingsResponse.json(),
      cryptoHoldingsResponse.json(),
    ])

    // ✅ Return unified dashboard payload
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
