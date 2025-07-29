// supabase/functions/trigger-revalidation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const REVALIDATION_TOKEN = Deno.env.get("REVALIDATION_TOKEN")
const NEXTJS_APP_URL = Deno.env.get("NEXTJS_APP_URL")

serve(async (req: Request) => {
  const { tag } = await req.json()

  if (!tag) {
    return new Response(
      JSON.stringify({ message: "Missing tag in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  try {
    const revalidateUrl = `${NEXTJS_APP_URL}/api/revalidate?secret=${REVALIDATION_TOKEN}&tag=${tag}`
    
    const res = await fetch(revalidateUrl, {
      method: "POST",
    })

    if (res.ok) {
      const data = await res.json()
      return new Response(
        JSON.stringify({ message: "Revalidation triggered successfully", data }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    } else {
      const errorText = await res.text()
      throw new Error(`Failed to revalidate: ${res.status} ${errorText}`)
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error triggering revalidation:", err.message)
      return new Response(
        JSON.stringify({ message: "Error triggering revalidation", error: err.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }

    console.error("An unknown error occurred:", err)
    return new Response(
      JSON.stringify({ message: "An unknown error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})