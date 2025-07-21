import { createClient } from "@/lib/supabase/supabaseServer"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInAnonymously()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}