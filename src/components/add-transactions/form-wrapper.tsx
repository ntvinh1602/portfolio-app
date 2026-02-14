"use client"

import {
  Root,
  Content,
  Header,
  Title,
  Subtitle,
} from "@/components/ui/dialog"

type FormDialogWrapperProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  FormComponent: React.ComponentType
}

export function FormDialogWrapper({
  open,
  onOpenChange,
  title,
  subtitle,
  FormComponent,
}: FormDialogWrapperProps) {
  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <Content className="flex flex-col gap-10">
        <Header>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </Header>
        <FormComponent />
      </Content>
    </Root>
  )
}
