import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";
import { Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export type AssetWithSecurity = Tables<"assets"> & {
  securities: Tables<"securities">;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const supabase = await createClient();
    const { userId } = await params;

    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("*")
      .not("type", "eq", "conceptual");

    if (accountsError) throw accountsError;

    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("*, securities(*)")
      .not("securities.asset_class", "in", "(equity,liability)");

    if (assetsError) throw assetsError;

    const { data: debts, error: debtsError } = await supabase.rpc(
      "get_active_debts",
      {
        p_user_id: userId,
      },
    );

    if (debtsError) throw debtsError;

    return NextResponse.json({
      accounts: accounts || [],
      assets: (assets as AssetWithSecurity[]) || [],
      debts: debts || [],
    });
  } catch (error) {
    console.error("Error fetching transaction form data:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction form data" },
      { status: 500 }
    );
  }
}