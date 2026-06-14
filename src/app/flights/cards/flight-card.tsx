"use client"

import { format } from "date-fns"
import { Plane, MapPin, Clock, Hash, User, Armchair, Star, ArrowLeftRight } from "lucide-react"
import { formatNum } from "@/lib/utils"

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
    <div
      className="
        group rounded-2xl border border-border bg-card
        p-5 transition-all duration-200
        hover:border-primary/40 hover:shadow-lg
        hover:shadow-primary/5
      "
    >
      {/* Top row: route + date */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Plane className="size-5 text-primary rotate-45" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="truncate">{flight.departure_airport}</span>
              <span className="text-muted-foreground shrink-0">→</span>
              <span className="truncate">{flight.arrival_airport}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{depName} → {arrName}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-medium">
            {format(new Date(flight.departure_time), "MMM d, yyyy")}
          </div>
          <div className="flex items-center justify-end gap-1 mt-0.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span>
              {format(new Date(flight.departure_time), "HH:mm")}
              {" – "}
              {format(new Date(flight.arrival_time), "HH:mm")}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom row: details */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <Hash className="size-3.5" />
          <span>{flight.flight_number}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="size-3.5" />
          <span>{flight.airline_name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plane className="size-3.5" />
          <span>{flight.aircraft_model}</span>
        </div>
        {flight.seat && (
          <div className="flex items-center gap-1.5">
            <Armchair className="size-3.5" />
            <span>{flight.seat}</span>
          </div>
        )}
        {seatClass && (
          <div className="flex items-center gap-1.5">
            <Star className="size-3.5" />
            <span>{seatClass}</span>
          </div>
        )}
        {seatPosition && (
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="size-3.5" />
            <span>{seatPosition}</span>
          </div>
        )}
        <div className="ml-auto font-medium text-foreground/80">
          {formatNum(flight.distance_km)} km
        </div>
      </div>
    </div>
  )
}
