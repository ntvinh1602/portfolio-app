"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Plane, Hash, Armchair, Star, ArrowLeftRight } from "lucide-react"
import { formatNum } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemFooter,
} from "@/components/ui/item"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export type Flight = {
  flight_number: string
  tail_number: string | null
  departure_time: string
  arrival_time: string
  departure_airport: string
  arrival_airport: string
  departure_country: string
  arrival_country: string
  airline_name: string
  airline_logo: string | null
  aircraft_model: string
  seat: string | null
  seat_type: string
  seat_position: string | null
  distance_km: number
}

const seatTypeLabels: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
}

function AirlineLogo({ logo }: { logo: string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!logo) {
      setUrl(null)
      return
    }

    let cancelled = false
    const supabase = createClient()

    supabase.storage
      .from("airlines")
      .createSignedUrl(logo, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) {
          setUrl(data.signedUrl)
        }
      })

    return () => {
      cancelled = true
    }
  }, [logo])

  if (!url) {
    return (
      <div className="flex size-full items-center justify-center rounded-xl bg-primary/10">
        <Plane className="size-5 text-primary rotate-45" />
      </div>
    )
  }

  return (
    <Image
      src={url}
      alt=""
      width={44}
      height={44}
      className="bg-foreground"
      objectFit="contain"
    />
  )
}

interface FlightCardProps {
  flight: Flight
  airportNames: Map<string, string> // IATA code → full name
}

export function FlightCard({ flight, airportNames }: FlightCardProps) {
  const depName = airportNames.get(flight.departure_airport) ?? flight.departure_airport
  const arrName = airportNames.get(flight.arrival_airport) ?? flight.arrival_airport

  const seatClass = (flight.seat_type && seatTypeLabels[flight.seat_type]) ?? flight.seat_type
  const seatPosition = flight.seat_position
    ? flight.seat_position.charAt(0).toUpperCase() + flight.seat_position.slice(1)
    : null

  return (
    <Item variant="outline">
      <ItemMedia variant="image">
        <AirlineLogo logo={flight.airline_logo} />
      </ItemMedia>

      <ItemContent className="min-w-0">
        <ItemTitle>
          {flight.departure_airport} → {flight.arrival_airport}
        </ItemTitle>
        <ItemDescription className="hidden sm:block truncate">
          {depName} → {arrName}
        </ItemDescription>
      </ItemContent>

      <ItemContent className="items-end">
        <ItemTitle>
          {format(new Date(flight.departure_time), "MMM d, yyyy")}
        </ItemTitle>
        <ItemDescription >
          {format(new Date(flight.departure_time), "HH:mm")}
          -
          {format(new Date(flight.arrival_time), "HH:mm")}
        </ItemDescription>
      </ItemContent>

      {/* ---- Detail tags ---- */}
      <ItemFooter className="border-t pt-4">
        <ItemContent className="grid grid-cols-2 md:grid-cols-3 items-center">
          <Badge variant="secondary">
            <Hash /> {flight.flight_number}
          </Badge>
          <Badge variant="secondary">
            <Plane /> {flight.airline_name}
          </Badge>
          <Badge variant="secondary">
            <Plane /> {flight.aircraft_model}
          </Badge>
          <Badge variant="secondary">
            <Armchair /> {flight.seat}
          </Badge>
          <Badge variant="secondary">
            <Star /> {seatClass}
          </Badge>
          <Badge variant="secondary">
            <ArrowLeftRight /> {seatPosition}
          </Badge>
        </ItemContent>
        <ItemContent className="flex items-center">
          <ItemDescription>Distance</ItemDescription>
          <ItemTitle>
            {formatNum(flight.distance_km)} km
          </ItemTitle>
        </ItemContent>
      </ItemFooter>
    </Item>
  )
}
