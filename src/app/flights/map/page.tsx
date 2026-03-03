"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import { useRoutesGeoJSON } from "@/hooks/useFlightRoutes"
import { useFlights } from "@/hooks/useFlights"
import { useAirports } from "@/hooks/useAirports"
import { SingleStats } from "./stats"
import { Earth, Plane, PlaneTakeoff, Route, TicketsPlane } from "lucide-react"

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

export default function FlightsPage() {
  const { data: routes, isLoading: loadingRoutes, error: routesError } =
    useRoutesGeoJSON()

  const { data: flights, isLoading: loadingFlights, error: flightsError } =
    useFlights()

  const { data: airports, isLoading: loadingAirports, error: airportsError } =
    useAirports()

  const stats = useMemo(() => {
    const flightsCount = flights?.length
    const totalDistance = flights?.reduce(
      (sum, f) => sum + (f.distance_km ?? 0),
      0
    )
    const uniqueAircraftModels = new Set(
      flights?.map((f) => f.aircraft_model)
        .filter(Boolean)
    )
    const uniqueAirports = new Set(
      flights
        ?.flatMap((f) => [f.departure_airport, f.arrival_airport])
        .filter((code): code is string => typeof code === "string")
    )
    const uniqueCountries = new Set(
      flights?.flatMap((f) => [
        f.departure_country,
        f.arrival_country,
      ]).filter(Boolean)
    )

    return [
      {
        title: "Flights",
        figure: flightsCount,
        icon: TicketsPlane
      },
      {
        title: "Total Distance (km)",
        figure: Math.round(totalDistance ?? 0),
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
  }, [flights])

  if (loadingFlights || loadingAirports || loadingRoutes)
    return <p>Loading flight data...</p>

  if (flightsError || airportsError || routesError)
    return <p>Failed to load flight data.</p>

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex gap-2">
        {stats.map((stat) => (
          <SingleStats
            key={stat.title}
            title={stat.title}
            figure={stat.figure ?? 0}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="relative h-full rounded-xl overflow-hidden border backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)]">
        <LeafletMap routes={routes} airports={airports} />
      </div>
    </div>
  )
}