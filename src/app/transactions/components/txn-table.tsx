"use client"

import { ReactNode, useState, useMemo, useCallback } from "react"
import { TabSwitcher } from "@/components/tab-switcher"
import { DataTable } from "@/components/table/data-table"
import { columns, Transaction } from "./columns"

export function TxnTable({
  data,
  loading,
  onTransactionSelect,
  children,
}: {
  data: Transaction[]
  loading: boolean
  onTransactionSelect: (txn: Transaction | null) => void
  children: ReactNode
}) {
  const [category, setCategory] = useState<"trade" | "cash">("trade")
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)

  const transactionCounts = useMemo(() => {
    return data.reduce(
      (acc, transaction) => {
        if (["buy", "sell", "split"].includes(transaction.type)) {
          acc.trade += 1
        } else {
          acc.cash += 1
        }
        return acc
      },
      { cash: 0, trade: 0 }
    )
  }, [data])

  const filteredData = useMemo(() => {
    if (category === "trade") {
      return data.filter((t) => ["buy", "sell", "split"].includes(t.type))
    }
    return data.filter((t) => !["buy", "sell", "split"].includes(t.type))
  }, [data, category])

  const handleRowClick = useCallback(
    (txn: Transaction) => {
      if (selectedTxn && selectedTxn.id === txn.id) {
        // Deselect if clicking the same transaction again
        setSelectedTxn(null)
        onTransactionSelect(null)
      } else {
        setSelectedTxn(txn)
        onTransactionSelect(txn)
      }
    },
    [selectedTxn, onTransactionSelect]
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        {children}
        <TabSwitcher
          variant="content"
          value={category}
          onValueChange={(value) => setCategory(value as "trade" | "cash")}
          options={[
            { label: "Cashflow", value: "cash", number: transactionCounts.cash },
            { label: "Trades", value: "trade", number: transactionCounts.trade },
          ]}
        />
      </div>
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        selectedRow={selectedTxn}
        onRowClick={handleRowClick}
        rowId={(row) => row.id}
        noDataMessage="No transactions found."
      />
    </div>
  )
}
