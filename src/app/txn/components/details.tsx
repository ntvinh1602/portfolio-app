"use client"

import * as React from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Transaction } from "./columns"   
import { formatNum } from "@/lib/utils"
import { Loading } from "@/components/loader"
import { Badge } from "@/components/ui/badge"
import { NotepadText } from "lucide-react"

interface TransactionDetailsProps {
  transaction: Transaction | null
  transactionLegs: any[]
  loading: boolean
}

export function TransactionDetails({
  transaction,
  transactionLegs,
  loading,
}: TransactionDetailsProps) {
  if (loading) {
    return (
      <Card className="bg-muted">
        <CardHeader>
          <CardDescription>Event</CardDescription>
          <CardTitle className="text-xl animate-pulse">Loading...</CardTitle>
          <CardAction>
            <NotepadText className="stroke-1 text-muted-foreground"/>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex w-full gap-4 items-center font-thin">
            <span className="w-full border-b-2">Debit</span>
            <span className="w-full border-b-2">Credit</span>
          </div>
          <div className="flex gap-4 font-thin">
            <div className="flex flex-col flex-1 gap-2">
              <Loading />
            </div>
            <div className="flex flex-col flex-1 gap-2">
              <Loading />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!transaction) {
    return (
      <Card className="bg-muted">
        <CardHeader>
          <CardDescription>Event</CardDescription>
          <CardAction>
            <NotepadText className="stroke-1 text-muted-foreground"/>
          </CardAction>
        </CardHeader>
        <CardContent className="flex justify-center">
          <span className="font-thin">
            No transaction selected
          </span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-muted">
      <CardHeader>
        <CardDescription>Event</CardDescription>
        <CardTitle className="text-xl">{transaction.description}</CardTitle>
        <CardAction>
          <NotepadText className="stroke-1 text-muted-foreground"/>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex w-full gap-4 items-center font-thin">
          <span className="w-full border-b-2">Debit</span>
          <span className="w-full border-b-2">Credit</span>
        </div>
        <div className="flex gap-4 font-thin">
          <div className="flex flex-col flex-1 gap-2">
            {transactionLegs
              .filter((leg) => {
                const assetClass = leg.assets.asset_class
                if (
                  assetClass !== "liability" &&
                  assetClass !== "equity" 
                ) return leg.quantity > 0
                else return leg.quantity < 0
              })
              .map((leg) => {
                const assetClass = leg.assets.asset_class
                if (
                  assetClass !== "liability" &&
                  assetClass !== "equity" 
                ) {
                  return (
                    <div key={leg.id} className="flex justify-between text-sm">
                      <div className="flex gap-2">
                        {assetClass === "epf"
                          ? assetClass.toUpperCase()
                          : assetClass.replace(/\b\w/g, (c:string) => c.toUpperCase())}
                        <Badge variant="default">{leg.assets.ticker}</Badge>
                      </div>
                      {formatNum(leg.amount)}
                    </div>
                  )
                } else {
                  return (
                    <div key={leg.id} className="flex justify-between text-sm">
                      <div className="flex gap-2">
                        {leg.assets.name}
                      </div>
                      {formatNum(leg.amount)}
                    </div>
                  )
            }})}
          </div>
          <div className="flex flex-col flex-1 gap-2">
            {transactionLegs
              .filter((leg) => {
                const assetClass = leg.assets.asset_class
                if (
                  assetClass !== "liability" &&
                  assetClass !== "equity" 
                ) return leg.quantity < 0
                else return leg.quantity > 0
              })
              .map((leg) => {
                const assetClass = leg.assets.asset_class
                if (
                  assetClass !== "liability" &&
                  assetClass !== "equity" 
                ) {
                  return (
                    <div key={leg.id} className="flex justify-between text-sm">
                      <div className="flex gap-2">
                        {assetClass === "epf"
                          ? assetClass.toUpperCase()
                          : assetClass.replace(/\b\w/g, (c:string) => c.toUpperCase())}
                        <Badge variant="default">{leg.assets.ticker}</Badge>
                      </div>
                      {formatNum(leg.amount)}
                    </div>
                  )
                } else {
                  return (
                    <div key={leg.id} className="flex justify-between text-sm">
                      <div className="flex gap-2">
                        {leg.assets.name}
                      </div>
                      {formatNum(leg.amount)}
                    </div>
                  )
                }
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}