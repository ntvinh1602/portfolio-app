import { withSupabase } from "npm:@supabase/server"
import { ingestAllSources } from "./ingest.ts"

const handler = withSupabase({ auth: "secret" }, async (_req, ctx) => {
  try {
    const result = await ingestAllSources(ctx.supabaseAdmin)
    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error("Error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json(
      { error: message },
      { status: 500 }
    )
  }
})

const mod = { fetch: handler }

export default mod
