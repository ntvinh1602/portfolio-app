import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { Tables } from "@/lib/database.types"

export const dynamic = "force-dynamic"

type AssetWithSecurity = Tables<"assets"> & {
  securities: Tables<"securities">
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: requestedUserId } = await params
    const { headers } = request

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`txn-driven-${user.id}`],
      },
    }

    const assetAccountDataResponse = await fetch(
      `${baseUrl}/api/query/${user.id}/asset-account-data`,
      fetchOptions,
    )

    if (!assetAccountDataResponse.ok) {
      const errorText = await assetAccountDataResponse.text();
      console.error(`Error fetching asset account data: ${assetAccountDataResponse.url} - ${assetAccountDataResponse.status} ${assetAccountDataResponse.statusText}`, errorText);
      throw new Error(`Failed to fetch from ${assetAccountDataResponse.url}`);
    }

    const { accounts, assets } = await assetAccountDataResponse.json()

    const debtsResponse = await fetch(
      `${baseUrl}/api/query/${user.id}/debts`,
      fetchOptions,
    )

    if (!debtsResponse.ok) {
      const errorText = await debtsResponse.text();
      console.error(`Error fetching debts data: ${debtsResponse.url} - ${debtsResponse.status} ${debtsResponse.statusText}`, errorText);
      throw new Error(`Failed to fetch from ${debtsResponse.url}`);
    }

    const debts = await debtsResponse.json()

    return NextResponse.json({
      accounts: accounts || [],
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