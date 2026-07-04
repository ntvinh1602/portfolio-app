import { createClient } from "@supabase/supabase-js"

/**
 * Cookie-free Supabase client for use in "use cache" scopes where
 * dynamic APIs (cookies, headers) are forbidden.
 *
 * Uses the publishable (anon) key — only suitable for public data
 * reads that do not require Row-Level Security tied to a user session.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
