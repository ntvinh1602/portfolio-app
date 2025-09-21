// ❌ Remove createBrowserClient
// import { createBrowserClient } from "@supabase/ssr"

// ✅ Use fetch to your own API routes instead
export function createClient() {
  throw new Error(
    "Use the server client instead. All auth should be handled through API routes with cookies."
  )
}
