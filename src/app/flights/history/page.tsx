import { Suspense } from "react"
import FlightsCardsClient from "./client"
import { createClient } from "@/lib/supabase/server"

export default function FlightsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading flights...</p>
      </div>
    }>
      <FlightsContent />
    </Suspense>
  )
}

async function FlightsContent() {
  const supabase = await createClient()

  const [
    airlinesRes,
    aircraftsRes,
    airportsRes,
    earliestFlightRes,
  ] = await Promise.all([
    supabase
      .schema("flight")
      .from("airlines")
      .select("id, name")
      .order("name"),

    supabase
      .schema("flight")
      .from("aircrafts")
      .select("id, icao_code, model")
      .order("icao_code"),

    supabase
      .schema("flight")
      .from("airports")
      .select("id, iata_code, name")
      .order("iata_code"),

    supabase
      .schema("flight")
      .from("flights_readable")
      .select("departure_time")
      .order("departure_time", { ascending: true })
      .limit(1),
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

  const earliestYear =
    earliestFlightRes.data?.[0]?.departure_time
      ? new Date(earliestFlightRes.data[0].departure_time).getFullYear()
      : new Date().getFullYear()

  return (
    <FlightsCardsClient
      airlines={airlinesRes.data ?? []}
      aircrafts={aircraftsRes.data ?? []}
      airports={airportsRes.data ?? []}
      earliestYear={earliestYear}
    />
  )
}
