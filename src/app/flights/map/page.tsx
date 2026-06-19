"use client"

import "leaflet/dist/leaflet.css"
import dynamic from "next/dynamic"
import { useMemo } from "react"
import { useRoutesGeoJSON } from "@/hooks/useFlightRoutes"
import { useFlights } from "@/hooks/useFlights"
import { useAirports } from "@/hooks/useAirports"
import { formatNum } from "@/lib/utils"
import { Earth, Plane, PlaneTakeoff, Route, TicketsPlane } from "lucide-react"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item"

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
    <div className="flex flex-col h-full gap-4 px-4 pb-4">
      <ItemGroup className="grid grid-cols-1 xl:grid-cols-5">
        {stats.map((stat) => (
          <Item variant="muted" key={stat.title}>
            <ItemMedia variant="icon">
              <stat.icon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-2xl">
                {formatNum(stat.figure ?? 0)}
              </ItemTitle>
              <ItemDescription>{stat.title}</ItemDescription>
            </ItemContent>
          </Item>          
        ))}
      </ItemGroup>

      <div className="relative h-full rounded-xl overflow-hidden border backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)]">
        <LeafletMap routes={routes} airports={airports} />
      </div>
    </div>
  )
}