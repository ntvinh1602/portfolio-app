import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from "react-leaflet"
import type { FeatureCollection } from "geojson"
import type { Airport } from "@/hooks/useAirports"

type Props = {
  routes: FeatureCollection
  airports: Airport[]
}

function interpolateColor(start: number[], end: number[], factor: number) {
  return start.map((s, i) => Math.round(s + factor * (end[i] - s)))
}

function getColor(freq: number, max: number) {
  const normalized = Math.log(freq + 1) / Math.log(max + 1)
  const green = [21, 128, 61]
  const yellow = [202, 138, 4]
  const red = [185, 28, 28]
  let rgb: number[]

  if (normalized <= 0.5) {
    const factor = normalized / 0.5
    rgb = interpolateColor(green, yellow, factor)
  } else {
    const factor = (normalized - 0.5) / 0.5
    rgb = interpolateColor(yellow, red, factor)
  }

  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

export default function LeafletMap({ routes, airports }: Props) {
  const frequencies = routes.features.map(f => f.properties?.route_frequency ?? 1)
  const maxFreq = Math.max(...frequencies, 1)

  return (
    <div className="h-full rounded-xl overflow-hidden">
      <MapContainer center={[15, 105]} zoom={4} className="h-full w-full">
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        <GeoJSON
          data={routes}
          style={(feature) => {
            const freq = feature?.properties?.route_frequency ?? 1
            return {
              color: getColor(freq, maxFreq),
              weight: 2,
              lineCap: "round",
              lineJoin: "round",
            }
          }}
        />

        {airports.map((airport) => (
          <CircleMarker
            key={airport.id}
            center={[airport.lat, airport.lng]}
            radius={4}
            pathOptions={{
              color: "#111",
              weight: 1,
              fillColor: "#2563eb",
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              {airport.name} ({airport.iata_code})
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}