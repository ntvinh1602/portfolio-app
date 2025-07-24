import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";
import { Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export type AssetWithSecurity = Tables<"assets"> & {
  securities: Tables<"securities">;
};

export async function GET() {
  try {
    const supabase = await createClient();

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

    const { data: debts, error: debtsError } = await supabase
      .from("debts")
      .select("*")
      .eq("status", "active");

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