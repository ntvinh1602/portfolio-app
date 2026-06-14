"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type FormDialogWrapperProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  FormComponent: React.ComponentType<{ onSuccess?: () => void }>
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
  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <FormComponent onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
