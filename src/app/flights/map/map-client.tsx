"use client"

import dynamic from "next/dynamic"
import type { FeatureCollection } from "geojson"

const LeafletMap = dynamic(
  () => import("./leaflet-map"),
  { ssr: false }
)

type Props = {
  data: FeatureCollection
}

export default function MapClient({ data }: Props) {
  return <LeafletMap data={data} />
}