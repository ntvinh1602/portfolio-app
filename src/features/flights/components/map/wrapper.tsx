"use client"

import dynamic from "next/dynamic"
import type { Airport } from "@/features/flights/actions/get-airports"
import type { FeatureCollection, LineString } from "geojson"
import type { RoutesGeoJSONProperties } from "@/features/flights/actions/get-geojson-routes"

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

type Props = {
  routes: FeatureCollection<LineString, RoutesGeoJSONProperties>
  airports: Airport[]
}

export default function LeafletMapDynamic({ routes, airports }: Props) {
  return <LeafletMap routes={routes} airports={airports} />
}
