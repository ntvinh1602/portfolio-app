"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DnseOverviewModel } from "@/lib/dnse/types"

interface Props {
  overview: DnseOverviewModel
}

export function DnseAccountOverview({ overview }: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{overview.investorName}</CardTitle>
          <CardDescription>
            DNSE brokerage identity for the selected sub-account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <IdentityField label="Custody Code" value={overview.custodyCode} />
            <IdentityField label="Investor ID" value={overview.investorId} />
            <IdentityField label="Account" value={overview.accountId} />
            <IdentityField
              label="Derivative Status"
              value={overview.derivativeStatus}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={overview.isDealAccount ? "default" : "secondary"}>
              {overview.isDealAccount ? "Deal account" : "Standard account"}
            </Badge>
            <Badge variant={overview.hasDerivative ? "secondary" : "outline"}>
              {overview.hasDerivative ? "Derivative enabled" : "Stock only"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overview.metrics.map((metric) => (
          <Card key={metric.label} size="sm">
            <CardHeader className="gap-0">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className={cn("text-xl", resolveTone(metric.tone))}>
                {metric.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}

function IdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function resolveTone(tone?: DnseOverviewModel["metrics"][number]["tone"]) {
  if (tone === "positive") {
    return "text-emerald-500"
  }

  if (tone === "negative") {
    return "text-red-500"
  }

  if (tone === "muted") {
    return "text-muted-foreground"
  }

  return "text-foreground"
}
