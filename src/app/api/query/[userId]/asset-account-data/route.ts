import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { Tables } from "@/lib/database.types"

export const dynamic = "force-dynamic"

type AssetWithSecurity = Tables<"assets"> & {
  securities: Tables<"securities">
}

type AssetAccountData = {
  accounts: Tables<"accounts">[]
  assets: AssetWithSecurity[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: assetAccountData, error: assetAccountError } = await supabase
      .rpc("get_asset_account_data", { p_user_id: user.id })
      .single()

    if (assetAccountError) {
      throw assetAccountError
    }

    return NextResponse.json(assetAccountData as AssetAccountData)

  } catch (e) {
    console.error("Unexpected error fetching asset account data:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}