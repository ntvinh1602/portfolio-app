import { NextRequest, NextResponse } from "next/server"
import { Tables } from "@/types/database.types"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const expectedSecret = process.env.MY_APP_SECRET

    if (!expectedSecret) {
      const errorMsg = "Server misconfigured: missing MY_APP_SECRET"
      console.error(errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }
    
    const baseUrl = request.url.split("/api")[0]

    // Prepare fetch options with the server-side secret
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${expectedSecret}`,
      },
      next: {
        revalidate: 600,
        tags: [`account`],
      },
    }

    // Fetch assets and debts in parallel
    const [assetDataResponse, debtsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/internal/assets`, fetchOptions),
      fetch(`${baseUrl}/api/internal/debts`, fetchOptions),
    ])

    for (const response of [assetDataResponse, debtsResponse]) {
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }
    }

    const [assets, debts] = await Promise.all([
      assetDataResponse.json(),
      debtsResponse.json(),
    ])

    return NextResponse.json({
      assets: (assets as Tables<"assets">[]) || [],
      debts: debts || [],
    })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
