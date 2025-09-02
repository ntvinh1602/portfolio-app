import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { Tables } from "@/types/database.types"

export const dynamic = "force-dynamic"

type AssetWithSecurity = Tables<"assets"> & {
  securities: Tables<"securities">
}

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
        tags: [`txn-driven`],
      },
    }

    const assetDataResponse = await fetch(
      `${baseUrl}/api/query/asset-data`,
      fetchOptions,
    )

    if (!assetDataResponse.ok) {
      const errorText = await assetDataResponse.text();
      console.error(`Error fetching asset account data: ${assetDataResponse.url} - ${assetDataResponse.status} ${assetDataResponse.statusText}`, errorText);
      throw new Error(`Failed to fetch from ${assetDataResponse.url}`);
    }

    const { assets } = await assetDataResponse.json()

    const debtsResponse = await fetch(
      `${baseUrl}/api/query/debts`,
      fetchOptions,
    )

    if (!debtsResponse.ok) {
      const errorText = await debtsResponse.text();
      console.error(`Error fetching debts data: ${debtsResponse.url} - ${debtsResponse.status} ${debtsResponse.statusText}`, errorText);
      throw new Error(`Failed to fetch from ${debtsResponse.url}`);
    }

    const debts = await debtsResponse.json()

    return NextResponse.json({
      assets: (assets as AssetWithSecurity[]) || [],
      debts: debts || [],
    })
    
  } catch (error) {
    console.error("Error fetching transaction form data:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction form data" },
      { status: 500 }
    )
  }
}