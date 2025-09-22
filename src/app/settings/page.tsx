"use client"

import { Header } from "@/components/header"
import { ImportForm } from "@/app/settings/components/import-form-content"

export default function Page() {

  return (
    <div>
      <Header title="Settings"/>
      <div className="grid grid-cols-4 px-0 gap-2 flex-1 overflow-hidden">
        <ImportForm />
      </div>
    </div>
  )
}
