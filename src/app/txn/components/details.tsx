"use client"

import * as React from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Transaction } from "./columns"
import { formatNum } from "@/lib/utils"
import { Loading } from "@/components/loader"
import { Badge } from "@/components/ui/badge"
import { NotepadText, DollarSign } from "lucide-react"
import Image from "next/image"

interface TransactionDetailsProps {
  transaction: Transaction | null
  transactionLegs: any[]
  loading: boolean
}

interface LegItemProps {
  leg: any
}

function LegItem({ leg }: LegItemProps) {
  const { assets, amount } = leg
  const assetClass = assets.asset_class

  return (
    <div className="flex justify-between text-sm">
      <div className="flex items-center gap-3">
        {assets.logo_url ? (
          <Image
            src={assets.logo_url}
            alt={assets.ticker}
            width={48}
            height={48}
            className="rounded-full object-contain"
          />
        ) : (
          <div className="size-12 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
            <DollarSign className="text-primary-foreground"/>
          </div>
        )}

        <div className="flex flex-col gap-1 justify-center">
          {assets.name}
          <Badge variant="outline">
            {assetClass === "epf"
              ? assetClass.toUpperCase()
              : assetClass.replace(/\b\w/g, (c:string) => c.toUpperCase())
            }
          </Badge>
        </div>
      </div>
      {formatNum(amount)}
    </div>
  )
}

export function TransactionDetails({
  transaction,
  transactionLegs,
  loading,
}: TransactionDetailsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Event</CardDescription>
          <CardTitle className="text-xl animate-pulse">Loading...</CardTitle>
          <CardAction>
            <NotepadText className="stroke-1 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 font-thin">
          <div className="flex flex-col flex-1 gap-4">
            <span className="w-full border-b">Debit</span>
            <Loading/>
          </div>
          <div className="flex flex-col flex-1 gap-4">
            <span className="w-full border-b">Credit</span>
            <Loading/>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!transaction) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Event</CardDescription>
          <CardAction>
            <NotepadText className="stroke-1 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex justify-center">
          <span className="font-thin">No transaction selected</span>
        </CardContent>
      </Card>
    )
  }

  const filterLegs = (isDebit: boolean) =>
    transactionLegs.filter((leg) => {
      const assetClass = leg.assets.asset_class
      const isAssets = assetClass !== "liability" && assetClass !== "equity"
      return isAssets ? leg.quantity > 0 === isDebit : leg.quantity < 0 === isDebit
    })

  return (
    <Card>
      <CardHeader>
        <CardDescription>Event</CardDescription>
        <CardTitle className="text-xl">{transaction.description}</CardTitle>
        <CardAction>
          <NotepadText className="stroke-1 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 font-thin">
        <div className="flex flex-col flex-1 gap-4">
          <span className="w-full border-b">Debit</span>
          {filterLegs(true).length == 0
            ? <span className="text-muted-foreground text-center">
                No debit entry
              </span>
            : filterLegs(true).map((leg) => (
              <LegItem key={leg.id} leg={leg} />
          ))}
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <span className="w-full border-b">Credit</span>
          {filterLegs(false).length == 0
            ? <span className="text-muted-foreground text-center">
                No credit entry
              </span>
            : filterLegs(false).map((leg) => (
              <LegItem key={leg.id} leg={leg} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
