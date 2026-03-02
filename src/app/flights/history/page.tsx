import FlightsClient from "./client"
import { createClient } from "@/lib/supabase/server"

export default async function FlightsPage() {
  const supabase = await createClient() // ✅ await here

  const [airlinesRes, aircraftsRes, airportsRes] = await Promise.all([
    supabase.schema("flight")
      .from("airlines")
      .select("id, name")
      .order("name"),

    supabase.schema("flight")
      .from("aircrafts")
      .select("id, icao_code, model")
      .order("icao_code"),

    supabase.schema("flight")
      .from("airports")
      .select("id, iata_code, name")
      .order("iata_code"),
  ])

  ;[
    { name: "Airlines", res: airlinesRes },
    { name: "Aircrafts", res: aircraftsRes },
    { name: "Airports", res: airportsRes },
  ].forEach(({ name, res }) => {
    if (res.error) {
      console.error(`${name} error:`, res.error)
      throw res.error
    }
  })

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <FlightsClient
          airlines={airlinesRes.data ?? []}
          aircrafts={aircraftsRes.data ?? []}
          airports={airportsRes.data ?? []}
        />
      </div>
    </div>
  )
}