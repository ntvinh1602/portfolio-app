"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase/supabaseClient"
import type { Session } from "@supabase/supabase-js"

type AuthContextType = {
  session: Session | null
  isLoading: boolean
  userId: string | null
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  userId: null,
})

export const AuthProvider = ({ children }: { children: ReactNode }): ReactNode => {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setIsLoading(false)
      const isAnonymous = !session?.user?.email
      setUserId(
        isAnonymous
          ? process.env.NEXT_PUBLIC_DEMO_USER_ID ?? null
          : session?.user?.id ?? null,
      )
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, isLoading, userId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}