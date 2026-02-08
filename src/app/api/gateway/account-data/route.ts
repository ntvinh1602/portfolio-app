import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if ( !supabaseUrl || !serviceRoleKey) {
      throw new Error("Server misconfigured: missing one or more environment variables")
    }

    const fetchSupabaseOptions = {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      next: { revalidate: 600, tags: ["reports"] }
    }
    
    const [assetResponse, debtResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/assets?select=*`, fetchSupabaseOptions),
      fetch(`${supabaseUrl}/rest/v1/debts?select=*&repay_txn_id=is.null`, fetchSupabaseOptions),
    ])

    for (const response of [
      assetResponse,
      debtResponse,
    ]) {
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }
    }

    const [
      assetData,
      debtData,
    ] = await Promise.all([
      assetResponse.json(),
      debtResponse.json(),
    ])
    
    return NextResponse.json({
      assetData,
      debtData,
    })
  } catch (error) {
    console.error("Supabase Data API Gateway Error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
