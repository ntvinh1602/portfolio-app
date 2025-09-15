import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { Tables } from "@/types/database.types"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { headers } = request

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`account`],
      },
    }

    const [assetDataResponse, debtsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/assets`, fetchOptions),
      fetch(`${baseUrl}/api/query/debts`, fetchOptions),
    ])

    for (const response of [assetDataResponse, debtsResponse]) {
      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `Error fetching account data: ${response.url} - ${response.status} ${response.statusText}`,
          errorText,
        )
        throw new Error(`Failed to fetch from ${response.url}`)
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
