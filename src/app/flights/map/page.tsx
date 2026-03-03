"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import { useFlightsGeoJSON } from "@/hooks/useFlightsGeoJSON"
import { useAirports } from "@/hooks/useAirports"
import { SingleStats } from "./stats"
import { Earth, Plane, PlaneTakeoff, Route, TicketsPlane } from "lucide-react"

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

export default function FlightsPage() {
  const { data, isLoading: loadingFlights, error: flightsError } =
    useFlightsGeoJSON()

  const { airports, isLoading: loadingAirports, error: airportsError } =
    useAirports()

  const stats = useMemo(() => {
    const features = data.features

    const flightsCount = features.length

    const totalDistance = features.reduce(
      (sum, f) => sum + (f.properties.distance_km ?? 0),
      0
    )

    const uniqueAircraftModels = new Set(
      features
        .map((f) => f.properties.aircraft_model)
        .filter(Boolean)
    )

    const uniqueAirports = new Set(
      features.flatMap((f) => [
        f.properties.departure_airport_id,
        f.properties.arrival_airport_id,
      ])
    )

    const uniqueCountries = new Set(
      features.flatMap((f) => [
        f.properties.departure_country,
        f.properties.arrival_country,
      ]).filter(Boolean)
    )

    return [
      { title: "Flights", figure: flightsCount, icon: TicketsPlane },
      {
        title: "Total Distance (km)",
        figure: Math.round(totalDistance),
        icon: Route,
      },
      {
        title: "Airports",
        figure: uniqueAirports.size,
        icon: PlaneTakeoff,
      },
      {
        title: "Countries",
        figure: uniqueCountries.size,
        icon: Earth,
      },
      {
        title: "Aircraft Models",
        figure: uniqueAircraftModels.size,
        icon: Plane,
      },
    ]
  }, [data])

  if (loadingFlights || loadingAirports)
    return <p>Loading flight data...</p>

  if (flightsError || airportsError)
    return <p>Failed to load flight data.</p>

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex gap-2">
        {stats.map((stat) => (
          <SingleStats
            key={stat.title}
            title={stat.title}
            figure={stat.figure}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="relative h-full rounded-xl overflow-hidden border backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)]">
        <LeafletMap routes={data} airports={airports} />
      </div>
    </div>
  )
}