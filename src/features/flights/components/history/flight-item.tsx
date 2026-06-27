import { format } from "date-fns"
import {
  Plane,
  Armchair,
  Star,
  ArrowLeftRight,
  Users,
  EllipsisVertical,
  SquarePen,
  Trash2,
  TicketsPlane,
} from "lucide-react"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Database } from "@/types/database.types"

type FlightList = Database["flight"]["Views"]["flights_readable"]["Row"]
export type Flight = {
  [K in keyof FlightList]: NonNullable<FlightList[K]>
}

const seatTypeLabels: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
}

interface FlightCardProps {
  flight: Flight
}

export function FlightItem({ flight }: FlightCardProps) {
  const seatType =
    (flight.seat_type && seatTypeLabels[flight.seat_type]) ?? flight.seat_type
  const seatPosition = flight.seat_position
    ? flight.seat_position.charAt(0).toUpperCase() +
      flight.seat_position.slice(1)
    : null

  const details = [
    {
      key: "flight",
      icon: TicketsPlane,
      value: flight.flight_number,
    },
    {
      key: "airline",
      icon: Users,
      value: flight.airline_name,
    },
    {
      key: "aircraft",
      icon: Plane,
      value: flight.aircraft_model,
    },
    {
      key: "seat",
      icon: Armchair,
      value: flight.seat,
    },
    {
      key: "class",
      icon: Star,
      value: seatType,
    },
    {
      key: "position",
      icon: ArrowLeftRight,
      value: seatPosition,
    },
  ] as const

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{flight.departure_airport_code}</ItemTitle>
        <ItemDescription className="hidden sm:block">
          {flight.departure_airport_name}
        </ItemDescription>
        <ItemDescription>
          {format(new Date(flight.departure_time), "HH:mm, dd MMM yyyy")}
        </ItemDescription>
      </ItemContent>
      <ItemMedia className="flex-col">
        <Plane className="size-4 rotate-45" />
        <span className="text-xs font-medium">{flight.tail_number}</span>
        <span className="text-xs font-medium">{flight.duration}</span>
      </ItemMedia>
      <ItemContent className="items-end">
        <ItemTitle>{flight.arrival_airport_code}</ItemTitle>
        <ItemDescription className="hidden sm:block">
          {flight.arrival_airport_name}
        </ItemDescription>
        <ItemDescription>
          {format(new Date(flight.arrival_time), "HH:mm, dd MMM yyyy")}
        </ItemDescription>
      </ItemContent>

      <ItemFooter className="bg-muted/50 px-3 py-2 rounded-2xl">
        <ItemMedia variant="image" className="hidden sm:block">
          <Image
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logo-img/${flight.airline_logo}`}
            alt=""
            width={44}
            height={44}
            unoptimized
          />
        </ItemMedia>

        <ItemContent className="grid grid-cols-2 md:grid-cols-3 items-center gap-2">
          {details.map(({ key, icon: Icon, value }) => (
            <Badge key={key} variant="ghost" className="pointer-events-none">
              <Icon />
              {value}
            </Badge>
          ))}
        </ItemContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-lg" variant="ghost">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <SquarePen />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemFooter>
    </Item>
  )
}
