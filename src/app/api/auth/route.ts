import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { email, password, token } = await req.json()
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken: token,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}