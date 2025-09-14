import * as React from "react"
import { Tables, Enums, Constants } from "@/types/database.types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Save, RefreshCw, CircleX } from "lucide-react"
import { assetClassFormatter } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function FormRow({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-4 items-center text-end gap-2">
      <Label>{label}</Label>
      <div className="col-span-3">{children}</div>
    </div>
  )
}

export function AssetFormBase<T extends Partial<Tables<"assets">>>({
  formData,
  handleChange,
  handleSubmit,
  isSaving = false,
  submitLabel,
  deleteConfig,
}: {
  formData: T
  handleChange: (field: keyof T, value: string) => void
  handleSubmit: (e: React.FormEvent) => void
  isSaving?: boolean
  submitLabel: string
  deleteConfig?: {
    isDeleting?: boolean
    onDelete: () => void
    deleteLabel?: string
    confirmMessage?: string
    entityName?: string
  }
}) {
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-thin">
      <FormRow label="Ticker">
        <Input
          value={formData.ticker ?? ""}
          onChange={(e) => handleChange("ticker", e.target.value)}
        />
      </FormRow>

      <FormRow label="Name">
        <Input
          value={formData.name ?? ""}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </FormRow>

      <FormRow label="Asset Class">
        <Select
          value={formData.asset_class ?? ""}
          onValueChange={(val) => handleChange("asset_class", val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an asset class" />
          </SelectTrigger>
          <SelectContent>
            {Constants.public.Enums.asset_class
              .filter((cls) => cls !== "liability" && cls !== "equity")
              .map((cls: Enums<"asset_class">) => (
                <SelectItem key={cls} value={cls}>
                  {assetClassFormatter(cls)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Currency">
        <Input
          value={formData.currency_code ?? ""}
          onChange={(e) => handleChange("currency_code", e.target.value)}
        />
      </FormRow>

      <FormRow label="Logo URL">
        <Input
          value={formData.logo_url ?? ""}
          onChange={(e) => handleChange("logo_url", e.target.value)}
        />
      </FormRow>

      <div className="flex justify-end gap-1">
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? <><RefreshCw className="animate-spin" />Processing</>
            : <><Save />{submitLabel}</>
          }
        </Button>

        {deleteConfig && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                type="button"
                disabled={deleteConfig.isDeleting}
              >
                {deleteConfig.isDeleting
                  ? <><RefreshCw className="animate-spin" />Deleting</>
                  : <><CircleX />{deleteConfig.deleteLabel ?? "Delete"}</>
                }
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {deleteConfig.confirmMessage ?? `Delete ${deleteConfig.entityName ?? "this item"}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. It will permanently remove{" "}
                  {deleteConfig.entityName ?? "this item"} and its associations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteConfig.onDelete}
                  className="bg-destructive/60 text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  )
}