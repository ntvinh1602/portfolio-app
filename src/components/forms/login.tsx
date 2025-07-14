"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "../ui/separator"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      // On successful login, Supabase client automatically handles the session.
      // Redirect the user to the dashboard.
      router.push("/")
    }
    setIsLoading(false)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-accent-foreground">
          Welcome back!
        </h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your credentials below to login
        </p>
      </div>
      <form onSubmit={handleLogin}>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="email" className="text-muted-foreground">
              Email
            </Label>
            <Input 
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="rounded-full"
            />
          </div>
          <div className="grid gap-3">
            <div className="flex items-center">
              <Label className="text-muted-foreground" htmlFor="password">
                Password
              </Label>
              <a
                href="#"
                className="ml-auto text-sm"
              >
                Forgot your password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="rounded-full"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
          <div className="flex items-center justify-between">
            <div className="w-full flex">
              <Separator />
            </div>
            <span className="bg-muted/0 text-nowrap text-muted-foreground text-sm px-2">
              No account yet?
            </span>
            <div className="w-full flex">
              <Separator />
            </div>
          </div>
          <Button variant="outline" className="w-full rounded-full">
            Login as a Guest
          </Button>
        </div>
      </form>
      <div className="text-center text-sm">
        Want to open an account?{" "}
        <a href="#" className="text-accent-foreground font-bold">
          Contact us.
        </a>
      </div>
    </div>
  )
}