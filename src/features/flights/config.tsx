import {
  Leaf,
  BriefcaseBusiness,
  TicketsPlane,
  Users,
  Plane,
  Armchair,
  Star,
  ArrowLeftRight,
} from "lucide-react"
import { IconLabel } from "@/types/global.types"
import { Flight } from "./components/history/flight-item"
import { ValueLabel } from "@/types/global.types"

export const seatType = [
  { key: "eco", label: "Economy", icon: Leaf },
  { key: "biz", label: "Business", icon: BriefcaseBusiness },
] as const satisfies readonly IconLabel[]

type SeatTypeKey = (typeof seatType)[number]["key"]

const seatTypeMap: Record<SeatTypeKey, string> = Object.fromEntries(
  seatType.map((s) => [s.key, s.label]),
) as Record<SeatTypeKey, string>

export const FlightDetail = [
  {
    key: "flight",
    label: "Flight",
    icon: TicketsPlane,
    getValue: (f) => f.flight_number,
  },
  {
    key: "airline",
    label: "Airline",
    icon: Users,
    getValue: (f) => f.airline_name,
  },
  {
    key: "aircraft",
    label: "Aircraft",
    icon: Plane,
    getValue: (f) => f.aircraft_model,
  },
  {
    key: "seat",
    label: "Seat",
    icon: Armchair,
    getValue: (f) => f.seat,
  },
  {
    key: "class",
    label: "Class",
    icon: Star,
    getValue: (f) => (f.seat_type ? seatTypeMap[f.seat_type] : null),
  },
  {
    key: "position",
    label: "Position",
    icon: ArrowLeftRight,
    getValue: (f) => f.seat_position,
  },
] as const satisfies ValueLabel<Flight>[]
