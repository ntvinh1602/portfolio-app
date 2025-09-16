import { mutate } from "swr"

export async function refreshData(tag: string, api: string) {
  await fetch("/api/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-token": process.env.NEXT_PUBLIC_REVALIDATION_TOKEN!,
      "x-tags": tag,
    },
  })

  await mutate(api)
}
