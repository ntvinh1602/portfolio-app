import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from "react-leaflet"
import type { FeatureCollection, LineString } from "geojson"
import type { RoutesGeoJSONProperties } from "@/hooks/useFlightRoutes"
import type { Airport } from "@/hooks/useAirports"
import L from "leaflet"

type RoutesGeoJSON = FeatureCollection<LineString, RoutesGeoJSONProperties>

type Props = {
  routes: RoutesGeoJSON
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
          style={() => ({
            color: "transparent",
            weight: 14,     // 👈 big hitbox
            opacity: 0,
          })}
          onEachFeature={(feature, layer) => {
            if (!(layer instanceof L.Path)) return

            const {
              airport_a_iata,
              airport_b_iata,
              airport_a_name,
              airport_b_name,
              airport_a_city,
              airport_b_city,
              route_frequency,
              flights_by_direction,
              distance_km,
            } = feature.properties

            let flightsHtml = ""

            if (flights_by_direction) {
              const directions =
                flights_by_direction as Record<
                  string,
                  Record<string, string[]>
                >

              for (const [direction, airlines] of Object.entries(directions)) {
                flightsHtml += `<strong>${direction}</strong><br/>`

                for (const [airline, flightNumbers] of Object.entries(airlines)) {
                  flightsHtml += `
                    &nbsp;&nbsp;${airline}: 
                    ${flightNumbers?.join(", ") ?? ""}
                    <br/>
                  `
                }

                flightsHtml += "<br/>"
              }
            }

            layer.bindPopup(`
              <div style="font-size:14px; line-height:1.5;">
                <strong>${airport_a_iata} ↔ ${airport_b_iata}</strong><br/>
                ${airport_a_name} (${airport_a_city ?? ""})<br/>
                ${airport_b_name} (${airport_b_city ?? ""})<br/></br>

                <strong>Total Flights:</strong> ${route_frequency}<br/>
                <strong>Distance:</strong> ${distance_km ?? "N/A"} km<br/><br/>

                ${flightsHtml || "No airline data"}
              </div>
            `)
          }}
        />
        <GeoJSON
          data={routes}
          style={(feature) => {
            const freq = feature?.properties.route_frequency ?? 1
            return {
              color: getColor(freq, maxFreq),
              weight: 2,              // 👈 stays thin
              lineCap: "round",
              lineJoin: "round",
              interactive: false,     // 👈 IMPORTANT
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