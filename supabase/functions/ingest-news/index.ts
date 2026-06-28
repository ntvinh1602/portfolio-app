import { withSupabase } from "npm:@supabase/server"
import { ingestAllSources } from "./ingest.ts"

export default {
  fetch: withSupabase({ auth: "secret" }, async (_req, ctx) => {
    try {
      const result = await ingestAllSources(ctx.supabaseAdmin)
      return Response.json({ success: true, ...result })
    } catch (err: any) {
      console.error("Error:", err)
      return Response.json(
        { error: err.message ?? "Internal server error" },
        { status: 500 }
      )
    }
  }),
}
