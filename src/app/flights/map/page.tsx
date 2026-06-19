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
  ItemMedia,
  ItemTitle
} from "@/components/ui/item"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

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
        title: "Total Distance",
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
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 2000,
          }),
        ]}
      >
        <CarouselContent>
          {stats.map((stat) => (
            <CarouselItem
              key={stat.title}
              className="sm:basis-1/2 md:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
            >
              <Item variant="muted">
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
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="relative h-full rounded-2xl overflow-hidden border">
        <LeafletMap routes={routes} airports={airports} />
      </div>
    </div>
  )
}