"use client"

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import Image from "next/image"
import {
  Item,
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemSeparator,
} from "@/components/ui/item"
import { Badge } from "@/components/ui/badge"
import { Plane, Calendar, Clock, ChevronRight } from "lucide-react"
import { FlightItemMenu } from "../history/flight-item-menu"
import type { Flight } from "./flight-config"
import { FlightDetail } from "./flight-config"
import { formatInTimeZone } from "date-fns-tz"

// Re-export for consumers that import from here
export type { Flight } from "./flight-config"
export { ticketClass } from "./flight-config"

interface FlightItemProps {
  flight: Flight
  itemKey: string
  onDelete: () => void
  onEditSuccess: () => void
}

export function FlightItem({
  flight,
  itemKey,
  onDelete,
  onEditSuccess,
}: FlightItemProps) {
  const departureDate = formatInTimeZone(
    flight.departure_time,
    flight.departure_tz,
    "yyyy-MM-dd",
  )
  const departureTime = formatInTimeZone(
    flight.departure_time,
    flight.departure_tz,
    "HH:mm X",
  )
  const arrivalDate = formatInTimeZone(
    flight.arrival_time,
    flight.arrival_tz,
    "yyyy-MM-dd",
  )
  const arrivalTime = formatInTimeZone(
    flight.arrival_time,
    flight.arrival_tz,
    "HH:mm X",
  )
  return (
    <AccordionItem value={itemKey} className="relative">
      <AccordionTrigger className="p-0 border-none hover:no-underline rounded-2xl [&>[data-slot=accordion-trigger-icon]]:hidden">
        <Item
          variant="default"
          className="cursor-pointer transition-colors hover:bg-accent/50 rounded-none"
        >
          <ItemMedia variant="image" className="hidden sm:block">
            <Image
              src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/logo/airline/${flight.airline_logo}`}
              alt=""
              width={44}
              height={44}
              unoptimized
            />
          </ItemMedia>
          <ItemSeparator orientation="vertical" className="hidden sm:block" />
          <ItemContent>
            <div className="flex gap-2">
              <Badge variant="secondary" className="hidden sm:block">
                {flight.departure_code}
              </Badge>
              <ItemTitle>{flight.departure_name}</ItemTitle>
            </div>
            <ItemDescription className="-ml-2">
              <Badge variant="ghost" className="pointer-events-none">
                <Calendar />
                {departureDate}
                <Clock />
                {departureTime}
              </Badge>
            </ItemDescription>
          </ItemContent>
          <ItemMedia className="flex-col">
            <Plane className="size-4 rotate-45 text-muted-foreground" />
            <ItemDescription className="text-xs">
              {flight.flight_number}
            </ItemDescription>
          </ItemMedia>
          <ItemContent className="items-end">
            <div className="flex gap-2">
              <ItemTitle>{flight.arrival_name}</ItemTitle>
              <Badge variant="secondary" className="hidden sm:block">
                {flight.arrival_code}
              </Badge>
            </div>
            <ItemDescription className="-mr-2">
              <Badge variant="ghost" className="pointer-events-none">
                <Calendar />
                {arrivalDate}
                <Clock />
                {arrivalTime}
              </Badge>
            </ItemDescription>
          </ItemContent>
          <ItemSeparator orientation="vertical" className="hidden sm:block" />
          <ChevronRight
            data-slot="accordion-trigger-icon"
            className="group-data-[state=open]/accordion-trigger:rotate-90 transition-transform duration-200"
          />
        </Item>
      </AccordionTrigger>
      <AccordionContent className="h-full flex items-center border-t border-border pt-4">
        <ItemGroup className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FlightDetail.map((detail) => {
            const value = detail.getValue(flight)
            if (!value) return null
            return (
              <Item
                key={detail.key}
                size="xs"
                className="p-1"
                variant="default"
              >
                <ItemMedia variant="icon" className="text-muted-foreground">
                  <detail.icon />
                </ItemMedia>
                <ItemContent>
                  <ItemDescription className="capitalize">
                    {value}
                  </ItemDescription>
                </ItemContent>
              </Item>
            )
          })}
        </ItemGroup>
        <FlightItemMenu
          flight={flight}
          onDelete={onDelete}
          onEditSuccess={onEditSuccess}
        />
      </AccordionContent>
    </AccordionItem>
  )
}
