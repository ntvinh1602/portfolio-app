import { createClient } from "@/lib/supabase/supabaseServer";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Revalidate the tags associated with the user
    revalidateTag(`performance-data-${userId}`);
    revalidateTag(`asset-data-${userId}`);

    return NextResponse.json({ revalidated: true, user: userId, now: Date.now() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to revalidate cache", details: errorMessage }, { status: 500 });
  }
}