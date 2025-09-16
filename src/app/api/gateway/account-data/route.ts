import { NextRequest, NextResponse } from "next/server"
import { Tables } from "@/types/database.types"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.url.split("/api")[0]

    // Prepare fetch options with the server-side secret
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${process.env.MY_APP_SECRET}`,
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
        const errorText = await response.text()
        console.error(`Error fetching account data`, errorText)
        throw new Error(`Failed to fetch account data`)
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
    console.error("Error fetching transaction form data:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction form data" },
      { status: 500 },
    )
  }
}
