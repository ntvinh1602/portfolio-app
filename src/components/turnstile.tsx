"use client"

import { Turnstile } from "@marsidev/react-turnstile"

export function TurnstileWidget({
  onSuccess,
}: {
  onSuccess: (token: string) => void
}) {
  return (
    <Turnstile
      onSuccess={onSuccess}
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
    />
  )
}