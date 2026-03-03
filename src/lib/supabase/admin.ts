import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

// Ensure this file is never bundled to the client
if (typeof window !== "undefined") {
  throw new Error("supabaseAdmin must not be used in the browser")
}

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)