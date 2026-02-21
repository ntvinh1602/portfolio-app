"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PencilLine, PlusIcon } from "lucide-react"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import { EditStockForm } from "./stock-assets/editForm"
import { AddAssetForm } from "./stock-assets/addForm"

export default function Page() {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div>
      <Header title="Transactions" />
      <div className="w-4/10 flex flex-col mx-auto">
        <Card variant="glow">
          <CardHeader>
            <CardTitle>Stock Assets</CardTitle>
            <CardDescription>
              Manage key metadata of existing stocks. Add or remove stocks on demand.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Add Stock
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <PencilLine /> Edit Stock
            </Button>
          </CardContent>
        </Card>
      </div>

      <FormDialogWrapper
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add New Stock"
        subtitle="Fill out the details to add a new stock asset."
        FormComponent={() => <AddAssetForm onSuccess={() => setAddOpen(false)} />}
      />

      <FormDialogWrapper
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Existing Stock"
        subtitle="Select a stock and update its information."
        FormComponent={() => <EditStockForm onSuccess={() => setEditOpen(false)} />}
      />
    </div>
  )
}
