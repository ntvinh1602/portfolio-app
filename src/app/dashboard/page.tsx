"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import { EquityCard } from "@/components/dashboard/equity-card"

export default function Page() {

  return (
    <PageMain>
      <PageHeader title="Dashboard" />
      <PageContent>
        <EquityCard />
      </PageContent>
    </PageMain>
  )
}