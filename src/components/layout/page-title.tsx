import React from "react"

type Props = {
  title: string
  children?: React.ReactNode
}

export function PageTitle({ title, children }: Props) {
  return (
    <div className="flex w-full xl:pt-15 justify-between items-center">
      <h1 className="text-2xl font-medium">{title}</h1>
      {children}
    </div>
  )
}
