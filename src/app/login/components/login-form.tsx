"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card"
import { TurnstileWidget } from "./turnstile"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const response = await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ email, password, token }),
    })

    if (response.ok) {
      router.push("/dashboard")
    } else {
      const { error } = await response.json()
      setError(error)
    }

    setIsLoading(false)
  }


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-none bg-card/0">
        <CardHeader className="px-0 flex flex-col items-center">
          <h1 className="text-2xl text-accent-foreground">
            Hello there!
          </h1>
          <CardDescription>
            Enter your credentials below to login
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleLogin}>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email
                </Label>
                <Input 
                  variant="default"
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="font-thin text-sm text-accent-foreground"
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label className="text-muted-foreground" htmlFor="password">
                    Password
                  </Label>
                </div>
                <Input
                  variant="default"
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="text-accent-foreground"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-center">
                <TurnstileWidget onSuccess={setToken} />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !token}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}