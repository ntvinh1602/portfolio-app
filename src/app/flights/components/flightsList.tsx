
type Flight = {
  id: string
  date: string
  airline: string
  flightNumber: string
  from: string
  to: string
  distance: string
}

const placeholderFlights: Flight[] = [
  {
    id: "1",
    date: "2024-12-14",
    airline: "Vietnam Airlines",
    flightNumber: "VN220",
    from: "SGN",
    to: "HAN",
    distance: "1,140 km",
  },
  {
    id: "2",
    date: "2024-10-03",
    airline: "Singapore Airlines",
    flightNumber: "SQ186",
    from: "SGN",
    to: "SIN",
    distance: "1,100 km",
  },
  {
    id: "3",
    date: "2024-08-21",
    airline: "Qatar Airways",
    flightNumber: "QR971",
    from: "SGN",
    to: "DOH",
    distance: "5,400 km",
  },
]

export function FlightsList() {
  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Flights</h2>
      </div>

      <div className="divide-y">
        {placeholderFlights.map((flight) => (
          <FlightRow key={flight.id} flight={flight} />
        ))}
      </div>
    </div>
  )
}

function FlightRow({ flight }: { flight: Flight }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors">
      <div className="space-y-1">
        <p className="font-medium">
          {flight.from} → {flight.to}
        </p>
        <p className="text-sm text-muted-foreground">
          {flight.airline} • {flight.flightNumber}
        </p>
      </div>

      <div className="text-right space-y-1">
        <p className="text-sm">{flight.date}</p>
        <p className="text-sm text-muted-foreground">
          {flight.distance}
        </p>
      </div>
    </div>
  )
}