"use client"

import * as React from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Transaction } from "./columns"
import { assetClassFormatter, formatNum } from "@/lib/utils"
import { Loading } from "@/components/loader"
import { Badge } from "@/components/ui/badge"
import { NotepadText, DollarSign } from "lucide-react"
import Image from "next/image"
import { TxnLeg, Expense } from "../types/data"

function AssociatedExpenses({ expenses }: { expenses: Expense[] }) {
  const transactionFee = expenses.find(
    (expense) => expense.description === "Transaction fee"
  )
  const incomeTax = expenses.find(
    (expense) => expense.description === "Income tax"
  )

  return (
    <div className="flex flex-col w-1/2 gap-2">
      {transactionFee && (
        <div className="flex justify-between text-sm">
          <span>Transaction Fee</span>
          <span>{formatNum(transactionFee.transaction_legs[0].amount)}</span>
        </div>
      )}
      {incomeTax && (
        <div className="flex justify-between text-sm">
          <span>Income Tax</span>
          <span>{formatNum(incomeTax.transaction_legs[0].amount)}</span>
        </div>
      )}
    </div>
  )
}

function LegItem({
  leg,
  type
}: {
  leg: TxnLeg
  type: "debit" | "credit"
}) {
  const { assets, amount } = leg

  return (
    <div className="grid grid-cols-4 text-sm">
      <div className="col-span-2 flex items-center gap-3">
        {assets.logo_url ? (
          <div className="size-9 flex-shrink-0 rounded-full bg-background flex items-center justify-center overflow-hidden">
            <Image
              src={assets.logo_url}
              alt={assets.ticker}
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="size-9 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
            <DollarSign className="size-5 text-primary-foreground" />
          </div>
        )}
        <div className="flex flex-col w-full text-start gap-1 justify-center truncate">
          {assets.name}
          <Badge variant="outline">
            {assetClassFormatter(assets.asset_class)}
          </Badge>
        </div>
      </div>
      <div className={`${type === "debit"
        ? "col-span-1 col-start-3"
        : "col-start-4"}`}
      >
        {formatNum(amount)}
      </div>
    </div>
  )
}

export function TransactionDetails({
  transaction,
  transactionLegs,
  associatedExpenses,
  loading,
}: {
  transaction: Transaction | null
  transactionLegs: TxnLeg[]
  associatedExpenses: Expense[]
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl animate-pulse">Loading</CardTitle>
          <CardAction>
            <NotepadText className="stroke-1 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 font-thin">
          <div className="grid grid-cols-4 text-end">
            <span className="border-b col-span-2 text-start">Assets</span>
            <span className="col-span-1 col-start-3 w-full border-b">Debit</span>
            <span className="col-span-1 col-start-4 w-full border-b">Credit</span>
            <div className="col-span-4 flex flex-col gap-4 pt-2">
              <Loading/>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!transaction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Transaction</CardTitle>
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
        <CardTitle className="text-xl">{transaction.description}</CardTitle>
        <CardAction>
          <NotepadText className="stroke-1 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 font-thin">
        {associatedExpenses.length > 0 && (
          <div className="flex flex-col gap-2"> 
            <AssociatedExpenses expenses={associatedExpenses} />
          </div>
        )}
        <div className="grid grid-cols-4 text-end">
          <span className="border-b col-span-2 text-start">Assets</span>
          <span className="col-span-1 col-start-3 w-full border-b">Debit</span>
          <span className="col-span-1 col-start-4 w-full border-b">Credit</span>
          <div className="col-span-4 flex flex-col gap-4 pt-2">
            {filterLegs(true).length !== 0 &&
              filterLegs(true).map((leg) => (
                <LegItem key={leg.id} leg={leg} type="debit"/>
            ))}
            {filterLegs(false).length !== 0 &&
              filterLegs(false).map((leg) => (
                <LegItem key={leg.id} leg={leg} type="credit"/>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
