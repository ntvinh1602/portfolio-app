"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"

const FORM_ID = "dialog-form"

type FormComponentProps = {
  onSuccess?: () => void
  formId: string
  onLoadingChange: (loading: boolean) => void
  resetFormRef: { current: () => void }
}

type FormDialogWrapperProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  FormComponent: React.ComponentType<FormComponentProps>
  onSuccess?: () => void
}

export function FormDialogWrapper({
  open,
  onOpenChange,
  title,
  subtitle,
  FormComponent,
  onSuccess,
}: FormDialogWrapperProps) {
  const [loading, setLoading] = useState(false)
  const resetFormRef = useRef<() => void>(() => {})

  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <FormComponent
          onSuccess={handleSuccess}
          formId={FORM_ID}
          onLoadingChange={setLoading}
          resetFormRef={resetFormRef}
        />
        <DialogFooter>
          <Field className="flex justify-end" orientation="horizontal">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetFormRef.current()}
            >
              Reset
            </Button>
            <Button type="submit" form={FORM_ID} disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </Field>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
