"use client"

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet"
import type { FeatureCollection } from "geojson"
import { CircleMarker, Popup } from "react-leaflet"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Props = {
  data: FeatureCollection
}
type Airport = {
  id: string
  iata_code: string
  name: string
  lat: number
  lng: number
}

function interpolateColor(
  start: number[],
  end: number[],
  factor: number
) {
  return start.map((s, i) =>
    Math.round(s + factor * (end[i] - s))
  )
}

function getColor(freq: number, max: number) {
  const normalized = Math.log(freq + 1) / Math.log(max + 1)

  // Darker, higher contrast tones
  const green = [21, 128, 61]     // #15803d (dark green)
  const yellow = [202, 138, 4]    // #ca8a04 (dark amber)
  const red = [185, 28, 28]       // #b91c1c (deep red)

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

export default function LeafletMap({ data }: Props) {
  const frequencies = data.features.map(
    (f) => f.properties?.route_frequency ?? 1
  )
  const [airports, setAirports] = useState<Airport[]>([])
  const supabase = createClient()
  useEffect(() => {
    async function fetchAirports() {
      const { data, error } = await supabase
        .schema("flight")
        .from("airports")
        .select("id, iata_code, name, lat, lng")

      if (!error && data) {
        setAirports(data)
      }
    }

    fetchAirports()
  }, [])
  const maxFreq = Math.max(...frequencies, 1)
  return (
    <div className="h-full rounded-xl overflow-hidden">
      <MapContainer
        center={[15, 105]}
        zoom={4}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          data={data}
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